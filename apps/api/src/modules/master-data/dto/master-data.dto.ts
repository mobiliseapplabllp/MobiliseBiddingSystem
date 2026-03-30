import { IsString, IsOptional, IsBoolean, IsInt, IsObject } from 'class-validator';

export class CreateReferenceDataDto {
  @IsString()
  type: string;

  @IsString()
  code: string;

  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  orgId?: string;

  @IsOptional()
  @IsObject()
  metadata?: object;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateReferenceDataDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsObject()
  metadata?: object;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
