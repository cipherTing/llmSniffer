import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProbeRunnerService } from './probe-runner.service';
import { ProbeResultsService } from './probe-results.service';
import { ProbeResult, ProbeResultSchema } from './schemas/probe-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ProbeResult.name, schema: ProbeResultSchema },
    ]),
  ],
  providers: [ProbeResultsService, ProbeRunnerService],
  exports: [ProbeResultsService, ProbeRunnerService, MongooseModule],
})
export class ProbeModule {}
