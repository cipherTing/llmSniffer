import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';

const QUEUE_SET = Symbol('QUEUE_SET');

@Module({
  providers: [
    {
      provide: QUEUE_SET,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const connection = { url: configService.getOrThrow<string>('REDIS_URL') };
        return {
          probeOpenai: new Queue(QUEUE_NAMES.probeOpenai, { connection }),
          probeAnthropic: new Queue(QUEUE_NAMES.probeAnthropic, { connection }),
          probeGemini: new Queue(QUEUE_NAMES.probeGemini, { connection }),
          metricsAggregate: new Queue(QUEUE_NAMES.metricsAggregate, { connection }),
          snapshotRefresh: new Queue(QUEUE_NAMES.snapshotRefresh, { connection }),
        };
      },
    },
    {
      provide: QueueService,
      inject: [QUEUE_SET],
      useFactory: (queues: ConstructorParameters<typeof QueueService>[0]) =>
        new QueueService(queues),
    },
  ],
  exports: [QueueService],
})
export class QueueModule {}
