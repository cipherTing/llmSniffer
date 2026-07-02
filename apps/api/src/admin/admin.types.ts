import type { Request } from 'express';
import type { AdminRole } from './admin.constants';

export type AdminPrincipal = {
  id: string;
  username: string;
  role: AdminRole;
};

export type AdminRequest = Request & {
  admin?: AdminPrincipal;
  cookies?: Record<string, string | undefined>;
};
