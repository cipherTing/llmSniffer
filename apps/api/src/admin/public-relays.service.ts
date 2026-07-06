import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import {
  RelaySnapshot,
  type RelaySnapshotDocument,
} from '../snapshots/schemas/relay-snapshot.schema';
import {
  PUBLIC_RELAYS_SNAPSHOT_KEY,
  type RelayHealthSnapshot,
} from '../snapshots/snapshot.service';

@Injectable()
export class PublicRelaysService {
  constructor(
    private readonly redisService: RedisService,
    @InjectModel(RelaySnapshot.name)
    private readonly snapshotModel: Model<RelaySnapshotDocument>,
  ) {}

  async getSnapshot() {
    const cached = await this.redisService.getJson<RelayHealthSnapshot>(
      PUBLIC_RELAYS_SNAPSHOT_KEY,
    );
    if (cached) return cached;

    const persisted = await this.snapshotModel
      .findOne({ key: PUBLIC_RELAYS_SNAPSHOT_KEY })
      .exec();
    if (persisted) return persisted.snapshot as RelayHealthSnapshot;

    return { generatedAt: new Date().toISOString(), relays: [] };
  }
}
