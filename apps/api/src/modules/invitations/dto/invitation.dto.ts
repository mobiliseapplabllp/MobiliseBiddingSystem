import { IsString, IsOptional, IsEmail, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ example: 'Acme Supplies Ltd' })
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  supplierName: string;

  @ApiProperty({ example: 'procurement@acme.com' })
  @IsEmail()
  supplierEmail: string;

  @ApiPropertyOptional({ example: 'We would like to invite you to bid on this opportunity.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @ApiPropertyOptional({ description: 'Supplier org ID if already registered' })
  @IsOptional()
  @IsString()
  supplierId?: string;
}

export class RespondInvitationDto {
  @ApiProperty({ enum: ['ACCEPTED', 'DECLINED'] })
  @IsString()
  response: 'ACCEPTED' | 'DECLINED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
