import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RelaySnapshotDocument = HydratedDocument<RelaySnapshot>;

@Schema({ timestamps: true })
export class RelaySnapshot {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true })
  generatedAt!: Date;

  @Prop({ required: true, type: Object })
  snapshot!: Record<string, unknown>;
}

export const RelaySnapshotSchema = SchemaFactory.createForClass(RelaySnapshot);
