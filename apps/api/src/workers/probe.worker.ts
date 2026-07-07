import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Job } from 'bullmq';
import { Model } from 'mongoose';
import { ProbeRunnerService } from '../probes/probe-runner.service';
import { ProbeResultsService } from '../probes/probe-results.service';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { QueueService, type ProbeJobData } from '../queue/queue.service';
import { SecretsService } from '../secrets/secrets.service';
import {
  MonitoredSite,
  type MonitoredSiteDocument,
} from '../sites/schemas/monitored-site.schema';

@Injectable()
export class ProbeWorker {
  constructor(
    @InjectModel(MonitoredSite.name)
    private readonly siteModel: Model<MonitoredSiteDocument>,
    private readonly secretsService: SecretsService,
    private readonly runner: ProbeRunnerService,
    private readonly resultsService: ProbeResultsService,
    private readonly queueService: QueueService,
  ) {}

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

@Processor(QUEUE_NAMES.probe, probeWorkerOptions())
export class ProbeProcessor extends WorkerHost {
  constructor(private readonly probeWorker: ProbeWorker) {
    super();
  }

  async process(job: Job<ProbeJobData>) {
    await this.probeWorker.processJob(job);
  }
}

function probeWorkerOptions() {
  return {
    concurrency: Number(process.env.PROBE_WORKER_CONCURRENCY ?? 10),
    lockDuration: Number(process.env.PROBE_JOB_LOCK_MS ?? 60_000),
  };
}
