import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Job, Worker } from 'bullmq';
import { Model } from 'mongoose';
import { ProbeRunnerService } from '../probes/probe-runner.service';
import { ProbeResultsService } from '../probes/probe-results.service';
import { QUEUE_NAMES, type WorkerRole } from '../queue/queue.constants';
import { QueueService, type ProbeJobData } from '../queue/queue.service';
import { SecretsService } from '../secrets/secrets.service';
import {
  MonitoredSite,
  type MonitoredSiteDocument,
} from '../sites/schemas/monitored-site.schema';

@Injectable()
export class ProbeWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProbeWorker.name);
  private worker: Worker<ProbeJobData> | null = null;

  constructor(
    @InjectModel(MonitoredSite.name)
    private readonly siteModel: Model<MonitoredSiteDocument>,
    private readonly secretsService: SecretsService,
    private readonly runner: ProbeRunnerService,
    private readonly resultsService: ProbeResultsService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService = new ConfigService(),
  ) {}

  onModuleInit() {
    const role = process.env.WORKER_ROLE as WorkerRole | undefined;
    const queueName = queueForRole(role);
    // 只有指定 provider worker 角色才会连接并消费探测队列，API 进程不会误消费。
    if (!queueName) return;

    this.worker = new Worker<ProbeJobData>(
      queueName,
      (job) => this.processJob(job),
      {
        connection: { url: this.configService.getOrThrow<string>('REDIS_URL') },
        concurrency: Number(process.env.PROBE_WORKER_CONCURRENCY ?? 10),
        lockDuration: Number(process.env.PROBE_JOB_LOCK_MS ?? 60_000),
      },
    );
    this.logger.log(`Probe worker started for ${queueName}`);
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }

  async processJob(job: Job<ProbeJobData>) {
    const data = job.data;
    const site = await this.siteModel
      .findById(data.siteId)
      .select('+probes.apiKeyEncrypted')
      .exec();
    const probe = site?.probes.find(
      (item) => item.id === data.probeId && item.region === data.region,
    );
    if (!site || !probe) {
      throw new Error(`Probe not found: ${data.siteId}/${data.probeId}`);
    }

    const result = await this.runner.run({
      siteId: data.siteId,
      probeId: data.probeId,
      region: data.region,
      provider: data.provider,
      requestTemplateId: probe.requestTemplateId,
      baseUrl: probe.baseUrl,
      apiKey: this.secretsService.decrypt(probe.apiKeyEncrypted),
      modelName: probe.modelName,
      scheduledAt: new Date(data.scheduledAt),
      bucketStart: new Date(data.bucketStart),
      attempt: job.attemptsMade + 1,
      timeoutMs: Number(process.env.PROBE_TIMEOUT_MS ?? 30_000),
    });

    await this.resultsService.upsertResult(result);
    await this.queueService.addMetricsJob({
      siteId: data.siteId,
      probeId: data.probeId,
      region: data.region,
      bucketStart: data.bucketStart,
    });
  }
}

function queueForRole(role: WorkerRole | undefined) {
  if (role === 'probe-openai') return QUEUE_NAMES.probeOpenai;
  if (role === 'probe-anthropic') return QUEUE_NAMES.probeAnthropic;
  if (role === 'probe-gemini') return QUEUE_NAMES.probeGemini;
  return null;
}
