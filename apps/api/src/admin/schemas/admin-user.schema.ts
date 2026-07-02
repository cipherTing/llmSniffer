import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ADMIN_ROLES, type AdminRole } from '../admin.constants';

export type AdminUserDocument = HydratedDocument<AdminUser>;

@Schema({ timestamps: true })
export class AdminUser {
  @Prop({ required: true, trim: true })
  username!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  usernameNormalized!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true, type: String, enum: ADMIN_ROLES })
  role!: AdminRole;

  @Prop()
  lastLoginAt?: Date;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);
AdminUserSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: 'system' } },
);
