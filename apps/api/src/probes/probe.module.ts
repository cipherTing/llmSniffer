import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProbeResultsService } from './probe-results.service';
import { ProbeResult, ProbeResultSchema } from './schemas/probe-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ProbeResult.name, schema: ProbeResultSchema }]),
  ],
  providers: [ProbeResultsService],
  exports: [ProbeResultsService, MongooseModule],
})
export class ProbeModule {}
