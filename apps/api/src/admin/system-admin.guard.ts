import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AdminRequest } from './admin.types';

@Injectable()
export class SystemAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AdminRequest>();

    if (request.admin?.role !== 'system') {
      throw new ForbiddenException('System administrator permission required');
    }

    return true;
  }
}
