import {
  IsString, IsOptional, IsEnum, IsNumber, IsPositive,
  MinLength, MaxLength, ValidateNested, IsArray, IsInt, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum EnvelopeTypeEnum {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE',
  THREE_ENVELOPE = 'THREE_ENVELOPE',
}

export enum EvaluationStatusEnum {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum CriterionEnvelopeEnum {
  TECHNICAL = 'TECHNICAL',
  COMMERCIAL = 'COMMERCIAL',
  GENERAL = 'GENERAL',
}

export enum AssignmentStatusEnum {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  RECUSED = 'RECUSED',
}

// ── Nested DTO: Criterion (used inside CreateEvaluationDto) ────────────────────

export class CreateCriterionNestedDto {
  @ApiProperty({ example: 'Technical Compliance' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  name: string;

  @ApiPropertyOptional({ example: 'Assess compliance with technical requirements' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: CriterionEnvelopeEnum, default: CriterionEnvelopeEnum.TECHNICAL })
  @IsOptional()
  @IsEnum(CriterionEnvelopeEnum)
  envelope?: CriterionEnvelopeEnum;

  @ApiProperty({ example: 30.0, description: 'Percentage weight within envelope' })
  @IsNumber()
  @IsPositive()
  @Max(100)
  weight: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// ── Create Evaluation DTO ──────────────────────────────────────────────────────

export class CreateEvaluationDto {
  @ApiProperty({ example: 'Technical & Commercial Evaluation - IT Services RFP' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ description: 'RFx event to evaluate' })
  @IsString()
  rfxEventId: string;

  @ApiPropertyOptional({ description: 'Business Unit ID' })
  @IsOptional()
  @IsString()
  buId?: string;

  @ApiPropertyOptional({ enum: EnvelopeTypeEnum, default: EnvelopeTypeEnum.SINGLE })
  @IsOptional()
  @IsEnum(EnvelopeTypeEnum)
  envelopeType?: EnvelopeTypeEnum;

  @ApiPropertyOptional({ example: 70.0, description: 'Technical weight percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  technicalWeight?: number;

  @ApiPropertyOptional({ example: 30.0, description: 'Commercial weight percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commercialWeight?: number;

  @ApiPropertyOptional({ type: [CreateCriterionNestedDto], description: 'Initial criteria' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCriterionNestedDto)
  criteria?: CreateCriterionNestedDto[];
}

// ── Update Evaluation DTO ──────────────────────────────────────────────────────

export class UpdateEvaluationDto {
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

  @ApiPropertyOptional({ enum: EnvelopeTypeEnum })
  @IsOptional()
  @IsEnum(EnvelopeTypeEnum)
  envelopeType?: EnvelopeTypeEnum;

  @ApiPropertyOptional({ example: 70.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  technicalWeight?: number;

  @ApiPropertyOptional({ example: 30.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commercialWeight?: number;
}

// ── Change Status DTO ──────────────────────────────────────────────────────────

export class ChangeEvaluationStatusDto {
  @ApiProperty({ enum: EvaluationStatusEnum })
  @IsEnum(EvaluationStatusEnum)
  status: EvaluationStatusEnum;
}

// ── Add Criterion DTO ──────────────────────────────────────────────────────────

export class AddCriterionDto {
  @ApiProperty({ example: 'Delivery Timeline' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  name: string;

  @ApiPropertyOptional({ example: 'Assess proposed delivery schedule' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: CriterionEnvelopeEnum, default: CriterionEnvelopeEnum.TECHNICAL })
  @IsOptional()
  @IsEnum(CriterionEnvelopeEnum)
  envelope?: CriterionEnvelopeEnum;

  @ApiProperty({ example: 20.0, description: 'Percentage weight within envelope' })
  @IsNumber()
  @IsPositive()
  @Max(100)
  weight: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

// ── Assign Evaluator DTO ───────────────────────────────────────────────────────

export class AssignEvaluatorDto {
  @ApiProperty({ description: 'User ID of the evaluator' })
  @IsString()
  evaluatorId: string;

  @ApiPropertyOptional({ enum: CriterionEnvelopeEnum, default: CriterionEnvelopeEnum.TECHNICAL })
  @IsOptional()
  @IsEnum(CriterionEnvelopeEnum)
  envelope?: CriterionEnvelopeEnum;
}

// ── Submit Score DTO ───────────────────────────────────────────────────────────

export class SubmitScoreDto {
  @ApiProperty({ description: 'Criterion ID to score' })
  @IsString()
  criterionId: string;

  @ApiProperty({ description: 'Bid ID being scored' })
  @IsString()
  bidId: string;

  @ApiProperty({ example: 8.5, description: 'Score given' })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiPropertyOptional({ example: 'Strong technical proposal with detailed methodology' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comments?: string;
}

// ── Submit Consensus Score DTO ────────────────────────────────────────────────

export class SubmitConsensusScoreDto {
  @ApiProperty({ description: 'Criterion ID to score' })
  @IsString()
  criterionId: string;

  @ApiProperty({ description: 'Bid ID being scored' })
  @IsString()
  bidId: string;

  @ApiProperty({ example: 8.0, description: 'Consensus score' })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiPropertyOptional({ example: 'Consensus agreed after panel discussion' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  comments?: string;
}

// ── Shortlist DTO ─────────────────────────────────────────────────────────────

export class ShortlistDto {
  @ApiPropertyOptional({ example: 3, description: 'Shortlist top N bids by score' })
  @IsOptional()
  @IsInt()
  @Min(1)
  topN?: number;

  @ApiPropertyOptional({ description: 'Specific bid IDs to shortlist' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bidIds?: string[];
}

// ── Filter DTO ─────────────────────────────────────────────────────────────────

export class EvaluationFilterDto {
  @ApiPropertyOptional({ enum: EvaluationStatusEnum })
  @IsOptional()
  @IsEnum(EvaluationStatusEnum)
  status?: EvaluationStatusEnum;

  @ApiPropertyOptional({ enum: EnvelopeTypeEnum })
  @IsOptional()
  @IsEnum(EnvelopeTypeEnum)
  envelopeType?: EnvelopeTypeEnum;

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
