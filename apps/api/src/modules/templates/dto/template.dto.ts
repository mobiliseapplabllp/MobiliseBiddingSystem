import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
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

export class CreateTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: RfxType })
  @IsEnum(RfxType)
  type: RfxType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Source RFx event ID to snapshot lots/items from' })
  @IsOptional()
  @IsString()
  sourceEventId?: string;
}

export class CreateFromTemplateDto {
  @ApiProperty({ description: 'Template ID to use as base' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'Title for the new event' })
  @IsString()
  @MaxLength(300)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buId?: string;
}
