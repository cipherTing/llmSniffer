import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  PROVIDER_TAGS,
  SPONSOR_TIERS,
  type ProviderTag,
  type SponsorTier,
} from '../../admin/admin.constants';

export type MonitoredSiteDocument = HydratedDocument<MonitoredSite>;
export type MonitoredSiteDocumentWithTimestamps = MonitoredSiteDocument & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ _id: false })
export class MonitoredSiteProbe {
  @Prop({ required: true, trim: true })
  id!: string;

  @Prop({ required: true, trim: true })
  requestTemplateId!: string;

  @Prop({ required: true, trim: true })
  baseUrl!: string;

  @Prop({ required: true, trim: true, select: false })
  apiKeyEncrypted!: string;

  @Prop({ required: true, trim: true })
  apiKeyMasked!: string;

  @Prop({ required: true, trim: true })
  modelName!: string;

  @Prop({ required: true, default: true })
  enabled!: boolean;

  @Prop({ required: true, default: 'default' })
  region!: 'default';

  @Prop({ required: true })
  nextRunAt!: Date;

  @Prop()
  lastScheduledAt?: Date;
}

export const MonitoredSiteProbeSchema =
  SchemaFactory.createForClass(MonitoredSiteProbe);

@Schema({ timestamps: true })
export class MonitoredSite {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true })
  url!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  urlNormalized!: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  domain!: string;

  @Prop({ required: true, type: String, enum: SPONSOR_TIERS })
  sponsorTier!: SponsorTier;

  @Prop({ required: true, min: 60, max: 3600 })
  monitorIntervalSeconds!: number;

  @Prop({ required: true, type: [String], enum: PROVIDER_TAGS })
  providers!: ProviderTag[];

  @Prop({ required: true, type: [MonitoredSiteProbeSchema] })
  probes!: MonitoredSiteProbe[];

  @Prop({ required: true, type: Types.ObjectId, ref: 'AdminUser', index: true })
  createdBy!: Types.ObjectId;
}

export const MonitoredSiteSchema = SchemaFactory.createForClass(MonitoredSite);
MonitoredSiteSchema.index({ 'probes.nextRunAt': 1 });
MonitoredSiteSchema.index({ 'probes.id': 1 });
