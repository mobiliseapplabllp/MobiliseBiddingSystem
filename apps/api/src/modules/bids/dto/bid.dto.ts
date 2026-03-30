import { IsString, IsOptional, IsNumber, IsPositive, MaxLength, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BidLineItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rfxLineItemId?: string;

  @ApiProperty({ example: 'Steel Pipes DN100' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  uom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateBidDto {
  @ApiProperty({ description: 'Invitation token (identifies the supplier)' })
  @IsString()
  invitationToken: string;

  @ApiPropertyOptional({ description: 'Lot ID — omit for event-level bid' })
  @IsOptional()
  @IsString()
  lotId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ type: [BidLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BidLineItemDto)
  lineItems?: BidLineItemDto[];
}

export class UpdateBidDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  totalPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @ApiPropertyOptional({ type: [BidLineItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BidLineItemDto)
  lineItems?: BidLineItemDto[];
}
