import {
  IsString, IsOptional, IsEnum, IsNumber, IsDateString,
  MinLength, MaxLength, ValidateNested, IsArray, IsInt, Min, Max, IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum ContractStatusEnum {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  RENEWED = 'RENEWED',
}

export enum AmendmentChangeTypeEnum {
  PRICE_CHANGE = 'PRICE_CHANGE',
  SCOPE_CHANGE = 'SCOPE_CHANGE',
  EXTENSION = 'EXTENSION',
  TERMINATION = 'TERMINATION',
  OTHER = 'OTHER',
}

export enum AmendmentStatusEnum {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// ── Create Contract DTO ────────────────────────────────────────────────────────

export class CreateContractDto {
  @ApiPropertyOptional({ description: 'Business Unit ID' })
  @IsOptional()
  @IsString()
  buId?: string;

  @ApiPropertyOptional({ description: 'RFx event ID (if linked to an RFx)' })
  @IsOptional()
  @IsString()
  rfxEventId?: string;

  @ApiPropertyOptional({ description: 'Award ID (if linked to an award)' })
  @IsOptional()
  @IsString()
  awardId?: string;

  @ApiProperty({ example: 'IT Services Framework Agreement 2026' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ example: 'FRAMEWORK', description: 'Contract type from MDM CONTRACT_TYPE' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  contractType: string;

  @ApiProperty({ description: 'Supplier organisation ID' })
  @IsString()
  supplierId: string;

  @ApiProperty({ example: 'Acme Supplies Co.' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  supplierName: string;

  @ApiPropertyOptional({ example: 150000.00, description: 'Total contract value' })
  @IsOptional()
  @IsNumber()
  totalValue?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ example: '2026-04-01', description: 'Contract start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2027-03-31', description: 'Contract end date (ISO 8601)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: '2026-03-28', description: 'Date the contract was signed' })
  @IsOptional()
  @IsDateString()
  signedDate?: string;

  @ApiPropertyOptional({ example: 'NET30', description: 'Payment terms from MDM PAYMENT_TERM' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentTerms?: string;

  @ApiPropertyOptional({ example: 'FOB', description: 'Incoterms from MDM INCOTERM' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  incoterms?: string;

  @ApiPropertyOptional({ description: 'Custom contract terms as JSON' })
  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;
}

// ── Update Contract DTO ────────────────────────────────────────────────────────

export class UpdateContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contractType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  supplierName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  signedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  incoterms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  terms?: Record<string, unknown>;
}

// ── Change Status DTO ──────────────────────────────────────────────────────────

export class ChangeContractStatusDto {
  @ApiProperty({ enum: ContractStatusEnum, description: 'Target status' })
  @IsEnum(ContractStatusEnum)
  status: ContractStatusEnum;

  @ApiPropertyOptional({ description: 'Reason for status change' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  reason?: string;
}

// ── Create Amendment DTO ───────────────────────────────────────────────────────

export class CreateAmendmentDto {
  @ApiProperty({ example: 'Price adjustment for Q3 2026' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ enum: AmendmentChangeTypeEnum })
  @IsEnum(AmendmentChangeTypeEnum)
  changeType: AmendmentChangeTypeEnum;

  @ApiPropertyOptional({ description: 'Previous value (JSON)' })
  @IsOptional()
  @IsObject()
  oldValue?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'New value (JSON)' })
  @IsOptional()
  @IsObject()
  newValue?: Record<string, unknown>;
}

// ── Filter DTO ─────────────────────────────────────────────────────────────────

export class ContractFilterDto {
  @ApiPropertyOptional({ enum: ContractStatusEnum })
  @IsOptional()
  @IsEnum(ContractStatusEnum)
  status?: ContractStatusEnum;

  @ApiPropertyOptional({ description: 'Contract type code' })
  @IsOptional()
  @IsString()
  contractType?: string;

  @ApiPropertyOptional({ description: 'Supplier organisation ID' })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'RFx event ID' })
  @IsOptional()
  @IsString()
  rfxEventId?: string;

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
