import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AdminSessionDocument = HydratedDocument<AdminSession>;

@Schema({ timestamps: true })
export class AdminSession {
  @Prop({ required: true, type: Types.ObjectId, ref: 'AdminUser', index: true })
  adminId!: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  tokenHash!: string;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const AdminSessionSchema = SchemaFactory.createForClass(AdminSession);
AdminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
