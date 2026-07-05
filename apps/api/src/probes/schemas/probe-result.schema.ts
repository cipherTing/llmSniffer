import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PROVIDER_TAGS, type ProviderTag } from '../../admin/admin.constants';
import { PROBE_RESULT_STATUSES, type ProbeResultStatus } from '../probe.types';

export type ProbeResultDocument = HydratedDocument<ProbeResult>;

@Schema({ timestamps: true })
export class ProbeResult {
  @Prop({ required: true, index: true })
  siteId!: string;

  @Prop({ required: true, index: true })
  probeId!: string;

  @Prop({ required: true, default: 'default', index: true })
  region!: 'default';

  @Prop({ required: true, type: String, enum: PROVIDER_TAGS })
  provider!: ProviderTag;

  @Prop({ required: true })
  modelName!: string;

  @Prop({ required: true, index: true })
  bucketStart!: Date;

  @Prop({ required: true })
  scheduledAt!: Date;

  @Prop({ required: true })
  startedAt!: Date;

  @Prop({ type: Date })
  firstTokenAt?: Date | null;

  @Prop({ required: true })
  finishedAt!: Date;

  @Prop({ type: Number })
  firstTokenLatencyMs?: number | null;

  @Prop({ required: true })
  totalLatencyMs!: number;

  @Prop({
    required: true,
    type: String,
    enum: PROBE_RESULT_STATUSES,
    index: true,
  })
  status!: ProbeResultStatus;

  @Prop({ type: Number })
  httpStatus?: number | null;

  @Prop({ type: String })
  errorCode?: string | null;

  @Prop({ required: true })
  reason!: string;

  @Prop({ required: true })
  attempt!: number;
}

export const ProbeResultSchema = SchemaFactory.createForClass(ProbeResult);
ProbeResultSchema.index(
  { siteId: 1, probeId: 1, region: 1, bucketStart: 1 },
  { unique: true },
);
ProbeResultSchema.index({ siteId: 1, bucketStart: -1 });
