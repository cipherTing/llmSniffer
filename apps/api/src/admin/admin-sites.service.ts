import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
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

    const payload = this.buildSitePayload(dto);

    try {
      const site = await this.siteModel
        .findByIdAndUpdate(id, { $set: payload }, { new: true, runValidators: true })
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

  private buildSitePayload(dto: CreateSiteDto | UpdateSiteDto) {
    const normalizedUrl = normalizeUrl(dto.url);
    const parsedUrl = new URL(normalizedUrl);
    const templateIds = new Set<string>(REQUEST_TEMPLATE_IDS);

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
      probes: dto.probes.map((probe) => ({
        requestTemplateId: probe.requestTemplateId,
        baseUrl: normalizeUrl(probe.baseUrl),
        apiKey: probe.apiKey.trim(),
        modelName: probe.modelName.trim(),
      })),
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
      probes: site.probes.map((probe, index) => ({
        id: `${site._id.toString()}-${index}`,
        modelName: probe.modelName,
        requestTemplateId: probe.requestTemplateId,
        baseUrl: probe.baseUrl,
        apiKey: probe.apiKey,
      })),
      createdBy: site.createdBy.toString(),
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
    };
  }
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
