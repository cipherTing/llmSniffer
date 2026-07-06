import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SecretsModule } from '../secrets/secrets.module';
import { SnapshotModule } from '../snapshots/snapshot.module';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import {
  AdminAuthController,
  AdminBootstrapController,
  AdminRequestTemplatesController,
  AdminSitesController,
  AdminUsersController,
} from './admin.controller';
import { AdminSitesService } from './admin-sites.service';
import {
  AdminSession,
  AdminSessionSchema,
} from './schemas/admin-session.schema';
import { AdminUser, AdminUserSchema } from './schemas/admin-user.schema';
import {
  MonitoredSite,
  MonitoredSiteSchema,
} from './schemas/monitored-site.schema';
import { SystemAdminGuard } from './system-admin.guard';
import { PublicController } from './public.controller';
import { PublicRelaysService } from './public-relays.service';

@Module({
  imports: [
    SecretsModule,
    SnapshotModule,
    MongooseModule.forFeature([
      { name: AdminUser.name, schema: AdminUserSchema },
      { name: AdminSession.name, schema: AdminSessionSchema },
      { name: MonitoredSite.name, schema: MonitoredSiteSchema },
    ]),
  ],
  controllers: [
    AdminBootstrapController,
    AdminAuthController,
    AdminUsersController,
    AdminSitesController,
    AdminRequestTemplatesController,
    PublicController,
  ],
  providers: [
    AdminAuthService,
    AdminAuthGuard,
    SystemAdminGuard,
    AdminSitesService,
    PublicRelaysService,
  ],
})
export class AdminModule {}
