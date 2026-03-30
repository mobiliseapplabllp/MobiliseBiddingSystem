import {
  IsString, IsOptional, IsEnum, IsDateString,
  IsNumber, IsPositive, MinLength, MaxLength, ValidateNested, IsArray, IsBoolean, IsInt, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AuctionTypeEnum {
  ENGLISH = 'ENGLISH',
  DUTCH = 'DUTCH',
  JAPANESE = 'JAPANESE',
  RANK_ONLY = 'RANK_ONLY',
  RANK_WITH_WINNING_BID = 'RANK_WITH_WINNING_BID',
  VICKREY = 'VICKREY',
  MULTI_ATTRIBUTE = 'MULTI_ATTRIBUTE',
}

export enum AuctionStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  EVALUATED = 'EVALUATED',
  AWARDED = 'AWARDED',
}

export enum BidVisibility {
  RANK_ONLY = 'RANK_ONLY',
  RANK_AND_PRICE = 'RANK_AND_PRICE',
  SEALED = 'SEALED',
}

// ── Nested DTOs ─────────────────────────────────────────────────────────────────

export class CreateAuctionLineItemDto {
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

  @ApiPropertyOptional({ example: 150.0 })
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

export class CreateAuctionLotDto {
  @ApiProperty({ example: 'Office Furniture Lot A' })
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
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  reservePrice?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  startingPrice?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  decrementMin?: number;

  @ApiPropertyOptional({ type: [CreateAuctionLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAuctionLineItemDto)
  lineItems?: CreateAuctionLineItemDto[];
}

// ── Main DTOs ───────────────────────────────────────────────────────────────────

export class CreateAuctionDto {
  @ApiProperty({ example: 'Reverse Auction: Office Furniture Q3' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Link to existing RFx event' })
  @IsOptional()
  @IsString()
  rfxEventId?: string;

  @ApiPropertyOptional({ description: 'Business Unit ID' })
  @IsOptional()
  @IsString()
  buId?: string;

  @ApiPropertyOptional({ enum: AuctionTypeEnum, default: AuctionTypeEnum.ENGLISH })
  @IsOptional()
  @IsEnum(AuctionTypeEnum)
  auctionType?: AuctionTypeEnum;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  reservePrice?: number;

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  startingPrice?: number;

  @ApiPropertyOptional({ example: 100, description: 'Minimum bid decrease required' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  decrementMin?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Maximum bid decrease allowed' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  decrementMax?: number;

  @ApiPropertyOptional({ example: 5, description: 'Minutes to extend by' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  extensionMinutes?: number;

  @ApiPropertyOptional({ example: 5, description: 'Extend if bid within last N minutes' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  extensionTriggerMinutes?: number;

  @ApiPropertyOptional({ example: 10, description: 'Max extensions. Null = unlimited' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxExtensions?: number;

  @ApiPropertyOptional({ enum: BidVisibility, default: BidVisibility.RANK_ONLY })
  @IsOptional()
  @IsEnum(BidVisibility)
  bidVisibility?: BidVisibility;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowTiedBids?: boolean;

  @ApiPropertyOptional({ type: [CreateAuctionLotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAuctionLotDto)
  lots?: CreateAuctionLotDto[];
}

export class UpdateAuctionDto {
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

  @ApiPropertyOptional({ enum: AuctionTypeEnum })
  @IsOptional()
  @IsEnum(AuctionTypeEnum)
  auctionType?: AuctionTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  reservePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  startingPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  decrementMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  decrementMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  extensionMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  extensionTriggerMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  maxExtensions?: number;

  @ApiPropertyOptional({ enum: BidVisibility })
  @IsOptional()
  @IsEnum(BidVisibility)
  bidVisibility?: BidVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowTiedBids?: boolean;
}

export class ChangeAuctionStatusDto {
  @ApiProperty({ enum: AuctionStatusEnum })
  @IsEnum(AuctionStatusEnum)
  status: AuctionStatusEnum;
}

export class InviteSupplierDto {
  @ApiProperty()
  @IsString()
  supplierId: string;

  @ApiProperty({ example: 'supplier@company.com' })
  @IsString()
  supplierEmail: string;

  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  supplierName: string;
}

export class AuctionFilterDto {
  @ApiPropertyOptional({ enum: AuctionStatusEnum })
  @IsOptional()
  @IsEnum(AuctionStatusEnum)
  status?: AuctionStatusEnum;

  @ApiPropertyOptional({ enum: AuctionTypeEnum })
  @IsOptional()
  @IsEnum(AuctionTypeEnum)
  auctionType?: AuctionTypeEnum;

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
