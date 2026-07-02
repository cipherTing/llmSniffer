import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ADMIN_SESSION_COOKIE } from './admin.constants';
import type { AdminRequest } from './admin.types';
import { AdminAuthService } from './admin-auth.service';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const cookies = request.cookies as
      Record<string, string | undefined> | undefined;
    const admin = await this.adminAuthService.resolveSession(
      cookies?.[ADMIN_SESSION_COOKIE],
    );

    if (!admin) {
      throw new UnauthorizedException();
    }

    request.admin = admin;
    return true;
  }
}
