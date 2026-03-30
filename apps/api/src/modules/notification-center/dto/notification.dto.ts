import {
  IsString, IsOptional, IsEnum, IsInt, Min, Max,
  IsBoolean, IsDateString, IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Enums ──────────────────────────────────────────────────────────────────────

export enum NotificationTypeEnum {
  EVENT_PUBLISHED = 'EVENT_PUBLISHED',
  BID_RECEIVED = 'BID_RECEIVED',
  AUCTION_STARTED = 'AUCTION_STARTED',
  AUCTION_CLOSED = 'AUCTION_CLOSED',
  AUCTION_BID_PLACED = 'AUCTION_BID_PLACED',
  EVALUATION_ASSIGNED = 'EVALUATION_ASSIGNED',
  EVALUATION_COMPLETED = 'EVALUATION_COMPLETED',
  AWARD_APPROVED = 'AWARD_APPROVED',
  AWARD_REJECTED = 'AWARD_REJECTED',
  CONTRACT_CREATED = 'CONTRACT_CREATED',
  CONTRACT_EXPIRING = 'CONTRACT_EXPIRING',
  CONTRACT_ACTIVATED = 'CONTRACT_ACTIVATED',
  SUPPLIER_REGISTERED = 'SUPPLIER_REGISTERED',
  SUPPLIER_APPROVED = 'SUPPLIER_APPROVED',
  REMINDER = 'REMINDER',
  SYSTEM = 'SYSTEM',
}

export enum ChannelEnum {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
}

// ── Create Notification DTO (internal use) ─────────────────────────────────────

export class CreateNotificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  orgId?: string;

  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: NotificationTypeEnum })
  @IsEnum(NotificationTypeEnum)
  type: NotificationTypeEnum;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  body: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ enum: ChannelEnum, default: ChannelEnum.IN_APP })
  @IsOptional()
  @IsEnum(ChannelEnum)
  channel?: ChannelEnum;

  @ApiPropertyOptional({ description: 'Schedule reminder for future delivery' })
  @IsOptional()
  @IsDateString()
  reminderAt?: string;
}

// ── Notification Filter DTO ────────────────────────────────────────────────────

export class NotificationFilterDto {
  @ApiPropertyOptional({ enum: NotificationTypeEnum })
  @IsOptional()
  @IsEnum(NotificationTypeEnum)
  type?: NotificationTypeEnum;

  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isRead?: boolean;

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

// ── Update Preferences DTO ─────────────────────────────────────────────────────

export class UpdatePreferenceDto {
  @ApiProperty({ enum: NotificationTypeEnum })
  @IsEnum(NotificationTypeEnum)
  type: NotificationTypeEnum;

  @ApiProperty()
  @IsBoolean()
  email: boolean;

  @ApiProperty()
  @IsBoolean()
  inApp: boolean;
}

export class UpdatePreferencesDto {
  @ApiProperty({ type: [UpdatePreferenceDto] })
  @IsArray()
  preferences: UpdatePreferenceDto[];
}

// ── Schedule Reminder DTO ──────────────────────────────────────────────────────

export class ScheduleReminderDto {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiProperty({ description: 'When to deliver the reminder (ISO 8601)' })
  @IsDateString()
  reminderAt: string;

  @ApiProperty()
  @IsString()
  message: string;
}
