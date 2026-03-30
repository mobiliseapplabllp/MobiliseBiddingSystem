import {
  IsString, IsOptional, IsEnum, IsNumber, IsInt, IsArray, IsObject,
  IsDateString, IsBoolean, MinLength, MaxLength, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ═══════════════════════════════════════════════════════
// Enums
// ═══════════════════════════════════════════════════════

export enum CompanySizeEnum {
  MICRO = 'MICRO',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SupplierProfileStatusEnum {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  BLACKLISTED = 'BLACKLISTED',
}

export enum DocumentVerificationStatusEnum {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum QualificationTypeEnum {
  PREQUALIFICATION = 'PREQUALIFICATION',
  DUE_DILIGENCE = 'DUE_DILIGENCE',
  ANNUAL_REVIEW = 'ANNUAL_REVIEW',
}

export enum QualificationStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  QUALIFIED = 'QUALIFIED',
  DISQUALIFIED = 'DISQUALIFIED',
  EXPIRED = 'EXPIRED',
}

export enum RiskLevelEnum {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// ═══════════════════════════════════════════════════════
// Sprint 13: Supplier Profile DTOs
// ═══════════════════════════════════════════════════════

export class CreateSupplierProfileDto {
  @ApiProperty({ enum: CompanySizeEnum, default: 'SMALL' })
  @IsOptional()
  @IsEnum(CompanySizeEnum)
  companySize?: CompanySizeEnum;

  @ApiPropertyOptional({ example: 2010 })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  yearEstablished?: number;

  @ApiPropertyOptional({ example: 5000000.0 })
  @IsOptional()
  @IsNumber()
  annualRevenue?: number;

  @ApiPropertyOptional({ example: 'CR-123456' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  registrationNumber?: string;

  @ApiPropertyOptional({ example: 'TAX-789012' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  taxId?: string;

  @ApiPropertyOptional({ example: 'https://www.supplier.com' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional({ description: 'Primary contact info: { name, email, phone }' })
  @IsOptional()
  @IsObject()
  primaryContact?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Registered and operational addresses' })
  @IsOptional()
  @IsObject()
  addresses?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Banking details (encrypted in production)' })
  @IsOptional()
  @IsObject()
  bankDetails?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Spend categories from MDM SPEND_CATEGORY', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spendCategories?: string[];

  @ApiPropertyOptional({ description: 'Array of certifications: { name, issuer, validUntil, documentUrl }' })
  @IsOptional()
  certifications?: unknown;

  @ApiPropertyOptional({ description: 'Diversity flags: minority/women/veteran/disability-owned' })
  @IsOptional()
  @IsObject()
  diversityFlags?: Record<string, unknown>;
}

export class UpdateSupplierProfileDto {
  @ApiPropertyOptional({ enum: CompanySizeEnum })
  @IsOptional()
  @IsEnum(CompanySizeEnum)
  companySize?: CompanySizeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  yearEstablished?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  annualRevenue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  registrationNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  primaryContact?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  addresses?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  bankDetails?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spendCategories?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  certifications?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  diversityFlags?: Record<string, unknown>;
}

export class ReviewProfileDto {
  @ApiProperty({ enum: ['APPROVED', 'SUSPENDED', 'BLACKLISTED'] })
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reviewNotes?: string;
}

// ═══════════════════════════════════════════════════════
// Sprint 13: Supplier Document DTOs
// ═══════════════════════════════════════════════════════

export class CreateSupplierDocumentDto {
  @ApiProperty({ example: 'TRADE_LICENSE', description: 'Document type from MDM DOCUMENT_TYPE' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  documentType: string;

  @ApiProperty({ example: 'Trade License 2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: '/uploads/trade-license.pdf' })
  @IsString()
  fileUrl: string;

  @ApiProperty({ example: 204800 })
  @IsInt()
  @Min(1)
  fileSize: number;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  mimeType: string;

  @ApiPropertyOptional({ description: 'Expiry date for certifications' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class VerifyDocumentDto {
  @ApiProperty({ enum: DocumentVerificationStatusEnum })
  @IsEnum(DocumentVerificationStatusEnum)
  status: DocumentVerificationStatusEnum;
}

// ═══════════════════════════════════════════════════════
// Sprint 14: Qualification DTOs
// ═══════════════════════════════════════════════════════

export class CreateQualificationDto {
  @ApiProperty({ description: 'Supplier organisation ID' })
  @IsString()
  supplierId: string;

  @ApiProperty({ enum: QualificationTypeEnum })
  @IsEnum(QualificationTypeEnum)
  qualificationType: QualificationTypeEnum;

  @ApiPropertyOptional({ description: 'Expiry date for the qualification' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Questionnaire responses as JSON' })
  @IsOptional()
  @IsObject()
  responses?: Record<string, unknown>;
}

export class ScoreQualificationDto {
  @ApiProperty({ example: 85, description: 'Score 0-100' })
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ enum: ['QUALIFIED', 'DISQUALIFIED'] })
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  disqualifiedReason?: string;

  @ApiPropertyOptional({ description: 'Updated questionnaire responses' })
  @IsOptional()
  @IsObject()
  responses?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════
// Sprint 15: Scorecard DTOs
// ═══════════════════════════════════════════════════════

export class CreateScorecardDto {
  @ApiProperty({ description: 'Supplier organisation ID' })
  @IsString()
  supplierId: string;

  @ApiProperty({ example: '2026-Q1', description: 'Period label' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  period: string;

  @ApiProperty({ description: 'Period start date' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Period end date' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ example: 85 })
  @IsNumber()
  @Min(0)
  @Max(100)
  overallScore: number;

  @ApiProperty({ example: 90 })
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore: number;

  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(0)
  @Max(100)
  deliveryScore: number;

  @ApiProperty({ example: 85 })
  @IsNumber()
  @Min(0)
  @Max(100)
  priceScore: number;

  @ApiProperty({ example: 88 })
  @IsNumber()
  @Min(0)
  @Max(100)
  complianceScore: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comments?: string;

  @ApiPropertyOptional({ enum: RiskLevelEnum, default: 'LOW' })
  @IsOptional()
  @IsEnum(RiskLevelEnum)
  riskLevel?: RiskLevelEnum;
}

// ═══════════════════════════════════════════════════════
// Filter DTOs
// ═══════════════════════════════════════════════════════

export class SupplierFilterDto {
  @ApiPropertyOptional({ enum: SupplierProfileStatusEnum })
  @IsOptional()
  @IsEnum(SupplierProfileStatusEnum)
  status?: SupplierProfileStatusEnum;

  @ApiPropertyOptional({ description: 'Spend category code' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

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

export class QualificationFilterDto {
  @ApiPropertyOptional({ description: 'Supplier org ID' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ enum: QualificationStatusEnum })
  @IsOptional()
  @IsEnum(QualificationStatusEnum)
  status?: QualificationStatusEnum;

  @ApiPropertyOptional({ enum: QualificationTypeEnum })
  @IsOptional()
  @IsEnum(QualificationTypeEnum)
  qualificationType?: QualificationTypeEnum;

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

export class ScorecardFilterDto {
  @ApiPropertyOptional({ description: 'Supplier org ID' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: '2026-Q1' })
  @IsOptional()
  @IsString()
  period?: string;

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
