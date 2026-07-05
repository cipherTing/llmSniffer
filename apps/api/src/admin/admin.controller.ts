import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ADMIN_SESSION_COOKIE, REQUEST_TEMPLATES } from './admin.constants';
import type { AdminRequest } from './admin.types';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './admin-auth.service';
import { AdminSitesService } from './admin-sites.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateSiteDto, UpdateSiteDto } from './dto/create-site.dto';
import { LoginAdminDto } from './dto/login-admin.dto';
import { SystemAdminGuard } from './system-admin.guard';

@Controller('api/admin/bootstrap')
export class AdminBootstrapController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Get('status')
  @Header('Cache-Control', 'no-store')
  async status() {
    return { initialized: await this.adminAuthService.isInitialized() };
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  async bootstrap(
    @Body() dto: BootstrapAdminDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return { admin: await this.adminAuthService.bootstrap(dto, response) };
  }
}

@Controller('api/admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
  @Header('Cache-Control', 'no-store')
  async login(
    @Body() dto: LoginAdminDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return { admin: await this.adminAuthService.login(dto, response) };
  }

  @UseGuards(AdminAuthGuard)
  @Get('me')
  @Header('Cache-Control', 'no-store')
  me(@Req() request: AdminRequest) {
    return { admin: request.admin };
  }

  @Post('logout')
  @Header('Cache-Control', 'no-store')
  async logout(
    @Req() request: AdminRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as
      Record<string, string | undefined> | undefined;
    return this.adminAuthService.logout(
      cookies?.[ADMIN_SESSION_COOKIE],
      response,
    );
  }
}

@UseGuards(AdminAuthGuard)
@Controller('api/admin/users')
export class AdminUsersController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @UseGuards(SystemAdminGuard)
  @Get()
  @Header('Cache-Control', 'no-store')
  async list() {
    return { admins: await this.adminAuthService.listAdmins() };
  }

  @UseGuards(SystemAdminGuard)
  @Post()
  @Header('Cache-Control', 'no-store')
  async create(@Body() dto: CreateAdminDto) {
    return { admin: await this.adminAuthService.createAdmin(dto) };
  }

  @UseGuards(SystemAdminGuard)
  @Delete(':id')
  @Header('Cache-Control', 'no-store')
  delete(@Param('id') id: string, @Req() request: AdminRequest) {
    return this.adminAuthService.deleteAdmin(id, request.admin!);
  }
}

@UseGuards(AdminAuthGuard)
@Controller('api/admin/sites')
export class AdminSitesController {
  constructor(private readonly adminSitesService: AdminSitesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  async list() {
    return { sites: await this.adminSitesService.listSites() };
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  async create(@Body() dto: CreateSiteDto, @Req() request: AdminRequest) {
    return {
      site: await this.adminSitesService.createSite(dto, request.admin!),
    };
  }

  @Put(':id')
  @Header('Cache-Control', 'no-store')
  async update(@Param('id') id: string, @Body() dto: UpdateSiteDto) {
    return {
      site: await this.adminSitesService.updateSite(id, dto),
    };
  }

  @Delete(':id')
  @Header('Cache-Control', 'no-store')
  async delete(@Param('id') id: string) {
    return this.adminSitesService.deleteSite(id);
  }
}

@UseGuards(AdminAuthGuard)
@Controller('api/admin/request-templates')
export class AdminRequestTemplatesController {
  @Get()
  @Header('Cache-Control', 'no-store')
  list() {
    return { templates: REQUEST_TEMPLATES };
  }
}
