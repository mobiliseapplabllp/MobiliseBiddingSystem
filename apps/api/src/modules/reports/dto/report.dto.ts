import {
  IsString, IsOptional, IsEnum, IsInt, Min, Max,
  IsObject, IsDateString, MinLength, MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum ReportTypeEnum {
  EVENT_SUMMARY = 'EVENT_SUMMARY',
  BID_COMPARISON = 'BID_COMPARISON',
  EVALUATION_REPORT = 'EVALUATION_REPORT',
  AWARD_SUMMARY = 'AWARD_SUMMARY',
  CONTRACT_STATUS = 'CONTRACT_STATUS',
  SUPPLIER_REPORT = 'SUPPLIER_REPORT',
  SPEND_REPORT = 'SPEND_REPORT',
  CUSTOM = 'CUSTOM',
}

export enum ReportStatusEnum {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  SCHEDULED = 'SCHEDULED',
  ARCHIVED = 'ARCHIVED',
}

export enum ReportFormatEnum {
  JSON = 'JSON',
  CSV = 'CSV',
  PDF_DATA = 'PDF_DATA',
}

// ── Create Report DTO ──────────────────────────────────────────────────────────

export class CreateReportDto {
  @ApiProperty({ example: 'Q1 Event Summary Report' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title: string;

  @ApiProperty({ enum: ReportTypeEnum, example: ReportTypeEnum.EVENT_SUMMARY })
  @IsEnum(ReportTypeEnum)
  reportType: ReportTypeEnum;

  @ApiPropertyOptional({ description: 'Report parameters: date range, filters, groupBy' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ReportFormatEnum, default: ReportFormatEnum.JSON })
  @IsOptional()
  @IsEnum(ReportFormatEnum)
  format?: ReportFormatEnum;

  @ApiPropertyOptional({ description: 'Schedule config: { cron, recipients[] }' })
  @IsOptional()
  @IsObject()
  scheduleConfig?: Record<string, unknown>;
}

// ── Update Report DTO ──────────────────────────────────────────────────────────

export class UpdateReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ enum: ReportTypeEnum })
  @IsOptional()
  @IsEnum(ReportTypeEnum)
  reportType?: ReportTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: ReportFormatEnum })
  @IsOptional()
  @IsEnum(ReportFormatEnum)
  format?: ReportFormatEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  scheduleConfig?: Record<string, unknown>;
}

// ── Report Filter DTO ──────────────────────────────────────────────────────────

export class ReportFilterDto {
  @ApiPropertyOptional({ enum: ReportTypeEnum })
  @IsOptional()
  @IsEnum(ReportTypeEnum)
  reportType?: ReportTypeEnum;

  @ApiPropertyOptional({ enum: ReportStatusEnum })
  @IsOptional()
  @IsEnum(ReportStatusEnum)
  status?: ReportStatusEnum;

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
