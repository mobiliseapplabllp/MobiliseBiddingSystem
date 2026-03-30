import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExchangeRateDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  fromCurrency: string;

  @ApiProperty({ example: 'EUR' })
  @IsString()
  toCurrency: string;

  @ApiProperty({ example: 0.92 })
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiPropertyOptional({ example: 'MANUAL' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({ example: '2026-03-29T00:00:00.000Z' })
  @IsDateString()
  effectiveDate: string;

  @ApiPropertyOptional({ example: '2026-04-29T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class ConvertCurrencyDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  from: string;

  @ApiProperty({ example: 'EUR' })
  @IsString()
  to: string;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  amount: number;
}

export class ExchangeRateFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fromCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  toCurrency?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  pageSize?: number;
}
