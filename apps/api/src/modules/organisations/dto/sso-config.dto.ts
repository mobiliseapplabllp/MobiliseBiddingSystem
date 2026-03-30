import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SsoProtocol {
  SAML = 'SAML',
  OIDC = 'OIDC',
}

export class UpdateSsoConfigDto {
  @ApiProperty({ enum: SsoProtocol })
  @IsEnum(SsoProtocol)
  protocol: SsoProtocol;

  @ApiProperty({ example: 'https://idp.company.com' })
  @IsString()
  issuerUrl: string;

  @ApiProperty({ example: 'esourcing-client-id' })
  @IsString()
  clientId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientSecret?: string;

  @ApiPropertyOptional({ example: 'https://idp.company.com/.well-known/openid-configuration' })
  @IsOptional()
  @IsString()
  metadataUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
