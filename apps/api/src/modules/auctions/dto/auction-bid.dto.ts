import { IsString, IsNumber, IsPositive, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaceBidDto {
  @ApiProperty({ example: 45000 })
  @IsNumber()
  @IsPositive()
  bidPrice: number;

  @ApiPropertyOptional({ description: 'Lot ID (if lot-level bidding)' })
  @IsOptional()
  @IsString()
  lotId?: string;

  @ApiProperty({ description: 'Invitation token for supplier authentication' })
  @IsString()
  invitationToken: string;
}

export class SetProxyBidDto {
  @ApiProperty({ example: 35000, description: 'Minimum price willing to bid' })
  @IsNumber()
  @IsPositive()
  minPrice: number;

  @ApiProperty({ example: 500, description: 'Amount to auto-decrement when outbid' })
  @IsNumber()
  @IsPositive()
  decrementStep: number;

  @ApiProperty({ description: 'Invitation token' })
  @IsString()
  invitationToken: string;
}

export class BidHistoryFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplierId?: string;

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
