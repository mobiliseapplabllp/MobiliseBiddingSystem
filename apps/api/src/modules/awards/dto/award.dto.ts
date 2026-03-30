import {
  IsString, IsOptional, IsEnum, IsNumber, IsPositive,
  MinLength, MaxLength, ValidateNested, IsArray, IsInt, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum AwardModeEnum {
  WHOLE_EVENT = 'WHOLE_EVENT',
  LOT_LEVEL = 'LOT_LEVEL',
  LINE_LEVEL = 'LINE_LEVEL',
  SPLIT = 'SPLIT',
  CONDITIONAL = 'CONDITIONAL',
}

export enum AwardStatusEnum {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NOTIFIED = 'NOTIFIED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AwardItemStatusEnum {
  AWARDED = 'AWARDED',
  REJECTED = 'REJECTED',
  CONDITIONAL = 'CONDITIONAL',
}

export enum ApprovalStatusEnum {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SKIPPED = 'SKIPPED',
}

// ── Nested DTO: AwardItem (used inside CreateAwardDto) ──────────────────────

export class CreateAwardItemDto {
  @ApiPropertyOptional({ description: 'Lot ID (for LOT_LEVEL or SPLIT awards)' })
  @IsOptional()
  @IsString()
  lotId?: string;

  @ApiPropertyOptional({ description: 'Bid submission ID' })
  @IsOptional()
  @IsString()
  bidId?: string;

  @ApiProperty({ description: 'Supplier organisation ID' })
  @IsString()
  supplierId: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  supplierName: string;

  @ApiProperty({ example: 150000.00, description: 'Awarded value' })
  @IsNumber()
  @IsPositive()
  awardedValue: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ enum: AwardItemStatusEnum, default: AwardItemStatusEnum.AWARDED })
  @IsOptional()
  @IsEnum(AwardItemStatusEnum)
  status?: AwardItemStatusEnum;

  @ApiPropertyOptional({ description: 'Rejection reason code from MDM REJECTION_REASON' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Conditions for CONDITIONAL awards' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  conditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}

// ── Nested DTO: ApprovalStep (used inside CreateAwardDto) ───────────────────

export class CreateApprovalStepDto {
  @ApiProperty({ description: 'User ID of the approver' })
  @IsString()
  approverId: string;

  @ApiProperty({ example: 'PROCUREMENT_MANAGER', description: 'Role of the approver' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  approverRole: string;

  @ApiProperty({ example: 1, description: 'Approval level (1, 2, 3...)' })
  @IsInt()
  @Min(1)
  @Max(10)
  level: number;
}

// ── Create Award DTO ────────────────────────────────────────────────────────

export class CreateAwardDto {
  @ApiProperty({ description: 'RFx event ID' })
  @IsString()
  rfxEventId: string;

  @ApiPropertyOptional({ description: 'Evaluation ID (if based on evaluation results)' })
  @IsOptional()
  @IsString()
  evaluationId?: string;

  @ApiPropertyOptional({ description: 'Business Unit ID' })
  @IsOptional()
  @IsString()
  buId?: string;

  @ApiProperty({ example: 'Award — IT Services RFP-2026-001' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: AwardModeEnum, default: AwardModeEnum.WHOLE_EVENT })
  @IsOptional()
  @IsEnum(AwardModeEnum)
  awardMode?: AwardModeEnum;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ type: [CreateAwardItemDto], description: 'Award items (supplier decisions)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAwardItemDto)
  items: CreateAwardItemDto[];

  @ApiPropertyOptional({ type: [CreateApprovalStepDto], description: 'Approval workflow steps' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalStepDto)
  approvalSteps?: CreateApprovalStepDto[];
}

// ── Update Award DTO ────────────────────────────────────────────────────────

export class UpdateAwardDto {
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

  @ApiPropertyOptional({ enum: AwardModeEnum })
  @IsOptional()
  @IsEnum(AwardModeEnum)
  awardMode?: AwardModeEnum;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ type: [CreateAwardItemDto], description: 'Replace award items' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAwardItemDto)
  items?: CreateAwardItemDto[];

  @ApiPropertyOptional({ type: [CreateApprovalStepDto], description: 'Replace approval steps' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApprovalStepDto)
  approvalSteps?: CreateApprovalStepDto[];
}

// ── Approve / Reject DTO ────────────────────────────────────────────────────

export class ApproveRejectDto {
  @ApiPropertyOptional({ example: 'Approved based on evaluation results and budget availability' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comments?: string;
}

// ── Filter DTO ──────────────────────────────────────────────────────────────

export class AwardFilterDto {
  @ApiPropertyOptional({ enum: AwardStatusEnum })
  @IsOptional()
  @IsEnum(AwardStatusEnum)
  status?: AwardStatusEnum;

  @ApiPropertyOptional({ enum: AwardModeEnum })
  @IsOptional()
  @IsEnum(AwardModeEnum)
  awardMode?: AwardModeEnum;

  @ApiPropertyOptional({ description: 'Filter by RFx event ID' })
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
