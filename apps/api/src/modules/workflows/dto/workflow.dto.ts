import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WorkflowStepDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  order: number;

  @ApiProperty({ example: 'ORG_ADMIN' })
  @IsString()
  approverRole: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  approverUserId?: string;

  @ApiPropertyOptional({ example: 'value > 10000' })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ example: 48 })
  @IsOptional()
  @IsNumber()
  timeoutHours?: number;
}

export class CreateWorkflowTemplateDto {
  @ApiProperty({ example: 'Award Approval Workflow' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'AWARD_APPROVAL',
    enum: [
      'EVENT_PUBLISH',
      'AWARD_APPROVAL',
      'CONTRACT_APPROVAL',
      'SUPPLIER_APPROVAL',
      'CUSTOM',
    ],
  })
  @IsString()
  triggerType: string;

  @ApiProperty({ type: [WorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateWorkflowTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [WorkflowStepDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps?: WorkflowStepDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class StartWorkflowDto {
  @ApiPropertyOptional({ description: 'Template ID to use. If omitted, uses the default template for the trigger type.' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ example: 'RFX_EVENT', enum: ['RFX_EVENT', 'AWARD', 'CONTRACT', 'SUPPLIER'] })
  @IsString()
  entityType: string;

  @ApiProperty({ example: 'uuid-of-entity' })
  @IsString()
  entityId: string;
}

export class WorkflowDecisionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comments?: string;
}

export class WorkflowFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  triggerType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  pageSize?: number;
}
