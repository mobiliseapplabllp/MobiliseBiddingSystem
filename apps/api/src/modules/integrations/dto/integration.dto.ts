import {
  IsString,
  IsOptional,
  IsArray,
  IsDateString,
  IsNumber,
  IsUrl,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production API Key' })
  @IsString()
  name: string;

  @ApiProperty({ example: ['read:events', 'write:bids'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  scopes: string[];

  @ApiPropertyOptional({ example: '2027-03-29T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class CreateWebhookDto {
  @ApiProperty({ example: 'https://example.com/webhook' })
  @IsUrl()
  url: string;

  @ApiProperty({ example: ['rfx.published', 'bid.submitted', 'award.approved'] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  events: string[];
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ example: 'https://example.com/webhook-v2' })
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiPropertyOptional({ example: ['rfx.published', 'bid.submitted'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];
}

export class IntegrationFilterDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  pageSize?: number;
}
