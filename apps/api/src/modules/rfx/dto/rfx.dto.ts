import {
  IsString, IsOptional, IsEnum, IsDateString,
  IsNumber, IsPositive, MinLength, MaxLength, ValidateNested, IsArray
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum RfxType {
  RFI = 'RFI',
  RFP = 'RFP',
  RFQ = 'RFQ',
  ITT = 'ITT',
  REVERSE_AUCTION = 'REVERSE_AUCTION',
  DUTCH_AUCTION = 'DUTCH_AUCTION',
  JAPANESE_AUCTION = 'JAPANESE_AUCTION',
}

export enum RfxStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
  AWARDED = 'AWARDED',
}

export class CreateLineItemDto {
  @ApiProperty({ example: 'Steel Pipes DN100' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @ApiPropertyOptional({ example: 'EA' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  uom?: string;

  @ApiPropertyOptional({ example: 150.00 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateLotDto {
  @ApiProperty({ example: 'Civil Works' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  estimatedValue?: number;

  @ApiPropertyOptional({ type: [CreateLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineItemDto)
  lineItems?: CreateLineItemDto[];
}

export class CreateRfxEventDto {
  @ApiProperty({ example: 'Supply of Office Furniture' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ enum: RfxType, example: RfxType.RFQ })
  @IsEnum(RfxType)
  type: RfxType;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  submissionDeadline?: string;

  @ApiPropertyOptional({ example: '2026-04-20T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  clarificationDeadline?: string;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  estimatedValue?: number;

  @ApiPropertyOptional({ example: 'PROC-2026-042' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  internalRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buId?: string;

  @ApiPropertyOptional({ type: [CreateLotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLotDto)
  lots?: CreateLotDto[];

  @ApiPropertyOptional({ description: 'Auction rules configuration (JSON)' })
  @IsOptional()
  auctionConfig?: Record<string, unknown>;
}

export class UpdateRfxEventDto {
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

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  submissionDeadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  clarificationDeadline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  estimatedValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  internalRef?: string;
}

export class RfxFilterDto {
  @ApiPropertyOptional({ enum: RfxStatus })
  @IsOptional()
  @IsEnum(RfxStatus)
  status?: RfxStatus;

  @ApiPropertyOptional({ enum: RfxType })
  @IsOptional()
  @IsEnum(RfxType)
  type?: RfxType;

  @ApiPropertyOptional({ example: 'furniture' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  pageSize?: number;
}
