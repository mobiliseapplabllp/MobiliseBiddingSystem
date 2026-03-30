export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: UserOrgRoleDto[];
  createdAt: string;
}

export interface UserOrgRoleDto {
  orgId: string;
  orgName: string;
  buId: string | null;
  buName: string | null;
  role: string;
}
