import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { Model, Types } from 'mongoose';
import type { Response } from 'express';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_TTL_MS,
  type AdminRole,
} from './admin.constants';
import type { AdminPrincipal } from './admin.types';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import {
  AdminSession,
  type AdminSessionDocument,
} from './schemas/admin-session.schema';
import { AdminUser, type AdminUserDocument } from './schemas/admin-user.schema';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,
    @InjectModel(AdminSession.name)
    private readonly adminSessionModel: Model<AdminSessionDocument>,
    private readonly configService: ConfigService,
  ) {}

  async isInitialized() {
    return (
      (await this.adminUserModel.exists({ role: 'system' }).exec()) !== null
    );
  }

  async bootstrap(dto: BootstrapAdminDto, response: Response) {
    const expectedToken = this.configService.get<string>(
      'ADMIN_BOOTSTRAP_TOKEN',
    );

    if (!expectedToken) {
      throw new BadRequestException('ADMIN_BOOTSTRAP_TOKEN is not configured');
    }

    if (dto.bootstrapToken !== expectedToken) {
      throw new ForbiddenException('Invalid bootstrap token');
    }

    if (await this.isInitialized()) {
      throw new BadRequestException('System administrator already exists');
    }

    const admin = await this.createAdminUser(
      dto.username,
      dto.password,
      'system',
    );
    await this.createSession(admin, response);
    return this.serializeAdmin(admin);
  }

  async login(dto: LoginAdminDto, response: Response) {
    const usernameNormalized = normalizeUsername(dto.username);
    const admin = await this.adminUserModel
      .findOne({ usernameNormalized })
      .select('+passwordHash')
      .exec();

    if (!admin || !(await bcrypt.compare(dto.password, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    admin.lastLoginAt = new Date();
    await admin.save();
    await this.createSession(admin, response);
    return this.serializeAdmin(admin);
  }

  async logout(token: string | undefined, response: Response) {
    if (token) {
      await this.adminSessionModel
        .deleteOne({ tokenHash: hashToken(token) })
        .exec();
    }

    response.clearCookie(ADMIN_SESSION_COOKIE, this.cookieOptions());
    return { ok: true };
  }

  async resolveSession(
    token: string | undefined,
  ): Promise<AdminPrincipal | null> {
    if (!token) return null;

    const session = await this.adminSessionModel
      .findOne({ tokenHash: hashToken(token) })
      .exec();
    if (!session || session.expiresAt.getTime() <= Date.now()) {
      if (session)
        await this.adminSessionModel.deleteOne({ _id: session._id }).exec();
      return null;
    }

    const admin = await this.adminUserModel.findById(session.adminId).exec();
    if (!admin) {
      await this.adminSessionModel.deleteOne({ _id: session._id }).exec();
      return null;
    }

    return this.serializeAdmin(admin);
  }

  async listAdmins() {
    const admins = await this.adminUserModel
      .find()
      .sort({ role: -1, usernameNormalized: 1 })
      .exec();
    return admins.map((admin) => this.serializeAdmin(admin));
  }

  async createAdmin(dto: CreateAdminDto) {
    const admin = await this.createAdminUser(
      dto.username,
      dto.password,
      'admin',
    );
    return this.serializeAdmin(admin);
  }

  async deleteAdmin(id: string, actor: AdminPrincipal) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid administrator id');
    }

    if (id === actor.id) {
      throw new BadRequestException('Cannot delete current administrator');
    }

    const admin = await this.adminUserModel.findById(id).exec();
    if (!admin) return { ok: true };

    if (admin.role === 'system') {
      throw new BadRequestException('System administrator cannot be deleted');
    }

    await this.adminUserModel.deleteOne({ _id: admin._id }).exec();
    await this.adminSessionModel.deleteMany({ adminId: admin._id }).exec();
    return { ok: true };
  }

  serializeAdmin(admin: AdminUserDocument): AdminPrincipal {
    return {
      id: admin._id.toString(),
      username: admin.username,
      role: admin.role,
    };
  }

  private async createAdminUser(
    username: string,
    password: string,
    role: AdminRole,
  ) {
    const usernameNormalized = normalizeUsername(username);
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      return await this.adminUserModel.create({
        username: username.trim(),
        usernameNormalized,
        passwordHash,
        role,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new BadRequestException('Administrator username already exists');
      }
      throw error;
    }
  }

  private async createSession(admin: AdminUserDocument, response: Response) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);

    await this.adminSessionModel.create({
      adminId: admin._id,
      tokenHash: hashToken(token),
      expiresAt,
    });

    response.cookie(ADMIN_SESSION_COOKIE, token, {
      ...this.cookieOptions(),
      maxAge: ADMIN_SESSION_TTL_MS,
      expires: expiresAt,
    });
  }

  private cookieOptions() {
    const webOrigin = this.configService.get<string>('WEB_ORIGIN') ?? '';
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: webOrigin.startsWith('https://'),
      path: '/',
    };
  }
}

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  );
}
