export interface CreateOrgDto {
  name: string;
  country: string;
  subdomain: string;
  defaultCurrency?: string;
  defaultLocale?: string;
  buIsolation?: boolean;
}

export interface UpdateOrgDto {
  name?: string;
  country?: string;
  defaultCurrency?: string;
  defaultLocale?: string;
  buIsolation?: boolean;
  brandingJson?: Record<string, unknown>;
}

export interface CreateBuDto {
  name: string;
  code: string;
  currency?: string;
}

export interface AssignRoleDto {
  userId: string;
  role: string;
  buId?: string;
  damLevel?: string;
}

export interface OrgResponseDto {
  id: string;
  name: string;
  country: string;
  subdomain: string;
  defaultCurrency: string;
  defaultLocale: string;
  buIsolation: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface BuResponseDto {
  id: string;
  orgId: string;
  name: string;
  code: string;
  currency: string | null;
}
