import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { NormalizedProbeResult } from './probe.types';
import { ProbeResult, type ProbeResultDocument } from './schemas/probe-result.schema';

@Injectable()
export class ProbeResultsService {
  constructor(
    @InjectModel(ProbeResult.name)
    private readonly resultModel: Model<ProbeResultDocument>,
  ) {}

  async upsertResult(result: NormalizedProbeResult) {
    return this.resultModel
      .findOneAndUpdate(
        {
          siteId: result.siteId,
          probeId: result.probeId,
          region: result.region,
          bucketStart: result.bucketStart,
        },
        { $set: result },
        { new: true, upsert: true, runValidators: true },
      )
      .exec();
  }
}
