import {
  IsString, IsOptional, IsDateString, IsEnum, IsInt, Min, Max,
  IsBoolean, IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum DashboardTypeEnum {
  SPEND = 'SPEND',
  SAVINGS = 'SAVINGS',
  SUPPLIER_PERFORMANCE = 'SUPPLIER_PERFORMANCE',
  EVENT_ACTIVITY = 'EVENT_ACTIVITY',
  AUCTION_PERFORMANCE = 'AUCTION_PERFORMANCE',
}

// ── Date Range Filter ──────────────────────────────────────────────────────────

export class DateRangeDto {
  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

// ── Create Dashboard DTO ───────────────────────────────────────────────────────

export class CreateDashboardDto {
  @ApiProperty({ example: 'Q1 Spend Overview' })
  @IsString()
  title: string;

  @ApiProperty({ enum: DashboardTypeEnum, example: DashboardTypeEnum.SPEND })
  @IsEnum(DashboardTypeEnum)
  type: DashboardTypeEnum;

  @ApiPropertyOptional({ description: 'Widget and filter configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// ── Update Dashboard DTO ───────────────────────────────────────────────────────

export class UpdateDashboardDto {
  @ApiPropertyOptional({ example: 'Updated Dashboard Title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: DashboardTypeEnum })
  @IsOptional()
  @IsEnum(DashboardTypeEnum)
  type?: DashboardTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

// ── Dashboard Filter DTO ───────────────────────────────────────────────────────

export class DashboardFilterDto extends DateRangeDto {
  @ApiPropertyOptional({ enum: DashboardTypeEnum })
  @IsOptional()
  @IsEnum(DashboardTypeEnum)
  type?: DashboardTypeEnum;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
