import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { REQUEST_TEMPLATES, type ProviderTag } from '../admin/admin.constants';
import { QueueService } from '../queue/queue.service';
import {
  MonitoredSite,
  type MonitoredSiteDocument,
} from '../sites/schemas/monitored-site.schema';

export const SCHEDULER_NOW = Symbol('SCHEDULER_NOW');

@Injectable()
export class SchedulerWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerWorker.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(MonitoredSite.name)
    private readonly siteModel: Model<MonitoredSiteDocument>,
    private readonly queueService: QueueService,
    @Optional()
    @Inject(SCHEDULER_NOW)
    private readonly now: () => Date = () => new Date(),
  ) {}

  onModuleInit() {
    if (process.env.WORKER_ROLE !== 'scheduler') return;

    this.logger.log('Scheduler worker started');
    this.timer = setInterval(
      () => void this.scheduleDueProbes(),
      Number(process.env.SCHEDULER_TICK_MS ?? 5000),
    );
    void this.scheduleDueProbes();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async scheduleDueProbes() {
    const now = this.now();
    const sites = await this.siteModel
      .find({ 'probes.nextRunAt': { $lte: now } })
      .exec();

    for (const site of sites) {
      let changed = false;

      for (const probe of site.probes) {
        if (!probe.enabled || probe.nextRunAt.getTime() > now.getTime()) {
          continue;
        }

        const provider = providerForTemplate(probe.requestTemplateId);
        const bucketStart = probe.nextRunAt.toISOString();
        await this.queueService.addProbeJob({
          provider,
          siteId: site._id.toString(),
          probeId: probe.id,
          region: probe.region,
          scheduledAt: now.toISOString(),
          bucketStart,
        });

        // 只推进调度游标，实际探测由 probe worker 消费队列执行。
        probe.lastScheduledAt = now;
        probe.nextRunAt = new Date(
          now.getTime() + site.monitorIntervalSeconds * 1000,
        );
        changed = true;
      }

      if (changed) await site.save();
    }
  }
}

function providerForTemplate(templateId: string): ProviderTag {
  const template = REQUEST_TEMPLATES.find((item) => item.id === templateId);
  if (!template) throw new Error(`Unknown request template: ${templateId}`);

  return template.provider;
}
