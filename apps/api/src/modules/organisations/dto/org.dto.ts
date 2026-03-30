import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, Matches, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrgRequestDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @MinLength(2)
  @MaxLength(3)
  country: string;

  @ApiProperty({ example: 'acme' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Subdomain must be lowercase alphanumeric with hyphens' })
  subdomain: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  defaultLocale?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  buIsolation?: boolean;
}

export class CreateBuRequestDto {
  @ApiProperty({ example: 'Middle East Division' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'BU-ME' })
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code: string;

  @ApiPropertyOptional({ example: 'AED' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateOrgRequestDto {
  @ApiPropertyOptional({ example: 'Acme Corporation Updated' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'AE' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'AED' })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  defaultLocale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  buIsolation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBuRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignRoleRequestDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ example: 'EVENT_MANAGER' })
  @IsString()
  role: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  damLevel?: string;
}

export class SetRolePermissionsDto {
  @ApiProperty({ example: ['EVENT_CREATE', 'EVENT_VIEW', 'BID_VIEW_ALL'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
