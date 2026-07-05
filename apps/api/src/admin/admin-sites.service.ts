import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { isValidObjectId, Model } from 'mongoose';
import { SecretsService } from '../secrets/secrets.service';
import { REQUEST_TEMPLATE_IDS } from './admin.constants';
import type { AdminPrincipal } from './admin.types';
import { CreateSiteDto, UpdateSiteDto } from './dto/create-site.dto';
import {
  MonitoredSite,
  type MonitoredSiteDocument,
  type MonitoredSiteDocumentWithTimestamps,
} from './schemas/monitored-site.schema';

@Injectable()
export class AdminSitesService {
  constructor(
    @InjectModel(MonitoredSite.name)
    private readonly siteModel: Model<MonitoredSiteDocument>,
    private readonly secretsService: SecretsService,
  ) {}

  async listSites() {
    const sites = await this.siteModel.find().sort({ createdAt: -1 }).exec();
    return sites.map((site) => this.serializeSite(site));
  }

  async createSite(dto: CreateSiteDto, admin: AdminPrincipal) {
    const payload = { ...this.buildSitePayload(dto), createdBy: admin.id };

    try {
      const site = await this.siteModel.create(payload);

      return this.serializeSite(site);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new BadRequestException('Site URL already exists');
      }
      throw error;
    }
  }

  async updateSite(id: string, dto: UpdateSiteDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid site id');
    }

    const existingSite = await this.siteModel
      .findById(id)
      .select('+probes.apiKeyEncrypted')
      .exec();

    if (!existingSite) {
      throw new NotFoundException('Site not found');
    }

    const payload = this.buildSitePayload(dto, existingSite);

    try {
      const site = await this.siteModel
        .findByIdAndUpdate(
          id,
          { $set: payload },
          { new: true, runValidators: true },
        )
        .exec();

      if (!site) {
        throw new NotFoundException('Site not found');
      }

      return this.serializeSite(site);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new BadRequestException('Site URL already exists');
      }
      throw error;
    }
  }

  async deleteSite(id: string) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid site id');
    }

    const result = await this.siteModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Site not found');
    }

    return { ok: true };
  }

  private buildSitePayload(
    dto: CreateSiteDto | UpdateSiteDto,
    existingSite?: MonitoredSiteDocument,
  ) {
    const normalizedUrl = normalizeUrl(dto.url);
    const parsedUrl = new URL(normalizedUrl);
    const templateIds = new Set<string>(REQUEST_TEMPLATE_IDS);
    const existingProbes = new Map(
      existingSite?.probes.map((probe) => [probe.id, probe]),
    );
    const now = new Date();

    if (dto.probes.some((probe) => !templateIds.has(probe.requestTemplateId))) {
      throw new BadRequestException('Invalid request template');
    }

    return {
      name: dto.name.trim(),
      url: normalizedUrl,
      urlNormalized: normalizedUrl.toLowerCase(),
      domain: parsedUrl.hostname.toLowerCase(),
      sponsorTier: dto.sponsorTier,
      monitorIntervalSeconds: dto.monitorIntervalSeconds,
      providers: dto.providers,
      probes: dto.probes.map((probe) => {
        const existingProbe = probe.id
          ? existingProbes.get(probe.id)
          : undefined;
        const apiKey = probe.apiKey?.trim();

        if (!apiKey && !existingProbe) {
          throw new BadRequestException('Probe API key is required');
        }

        return {
          id: probe.id ?? newProbeId(),
          requestTemplateId: probe.requestTemplateId,
          baseUrl: normalizeUrl(probe.baseUrl),
          apiKeyEncrypted: apiKey
            ? this.secretsService.encrypt(apiKey)
            : existingProbe!.apiKeyEncrypted,
          apiKeyMasked: apiKey
            ? maskApiKey(apiKey)
            : existingProbe!.apiKeyMasked,
          modelName: probe.modelName.trim(),
          enabled: probe.enabled ?? existingProbe?.enabled ?? true,
          region: 'default' as const,
          nextRunAt: existingProbe?.nextRunAt ?? now,
          lastScheduledAt: existingProbe?.lastScheduledAt,
        };
      }),
    };
  }

  serializeSite(
    site: MonitoredSiteDocument | MonitoredSiteDocumentWithTimestamps,
  ) {
    const timestamps = site as MonitoredSiteDocumentWithTimestamps;

    return {
      id: site._id.toString(),
      name: site.name,
      url: site.url,
      domain: site.domain,
      sponsorTier: site.sponsorTier,
      monitorIntervalSeconds: site.monitorIntervalSeconds,
      providers: site.providers,
      probes: site.probes.map((probe) => ({
        id: probe.id,
        modelName: probe.modelName,
        requestTemplateId: probe.requestTemplateId,
        baseUrl: probe.baseUrl,
        apiKeyMasked: probe.apiKeyMasked,
        enabled: probe.enabled,
        region: probe.region,
        nextRunAt: probe.nextRunAt,
        lastScheduledAt: probe.lastScheduledAt,
      })),
      createdBy: site.createdBy.toString(),
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
    };
  }
}

function newProbeId() {
  return `probe_${randomUUID().replace(/-/g, '')}`;
}

function maskApiKey(value: string | undefined) {
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 3)}...${value.slice(-4)}`;
}

function normalizeUrl(value: string) {
  const url = new URL(value.trim());
  url.hash = '';
  url.hostname = url.hostname.toLowerCase();

  if (url.pathname === '/') url.pathname = '';
  return url.toString();
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}
