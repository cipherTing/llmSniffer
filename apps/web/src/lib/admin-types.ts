import type { ProviderTag, RelayHealthSnapshot, SponsorTier } from "./monitoring-types";

export type AdminRole = "system" | "admin";

export type AdminUser = {
  id: string;
  username: string;
  role: AdminRole;
};

export type RequestTemplate = {
  id: string;
  name: string;
  description: string;
};

export type MonitoredSiteProbe = {
  id: string;
  requestTemplateId: string;
  baseUrl: string;
  apiKeyMasked: string;
  modelName: string;
  enabled: boolean;
  region: "default";
  nextRunAt: string;
  lastScheduledAt?: string;
};

export type MonitoredSite = {
  id: string;
  name: string;
  url: string;
  domain: string;
  sponsorTier: SponsorTier;
  monitorIntervalSeconds: number;
  providers: ProviderTag[];
  probes: MonitoredSiteProbe[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BootstrapStatusResponse = {
  initialized: boolean;
};

export type AdminResponse = {
  admin: AdminUser;
};

export type AdminsResponse = {
  admins: AdminUser[];
};

export type SitesResponse = {
  sites: MonitoredSite[];
};

export type RequestTemplatesResponse = {
  templates: RequestTemplate[];
};

export type PublicRelaysResponse = RelayHealthSnapshot;
