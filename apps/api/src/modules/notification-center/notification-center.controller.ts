import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { NotificationCenterService } from './notification-center.service';
import {
  NotificationFilterDto,
  UpdatePreferencesDto,
  ScheduleReminderDto,
} from './dto/notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationCenterController {
  constructor(private readonly service: NotificationCenterService) {}

  @Get()
  @Roles('BUYER', 'EVENT_MANAGER', 'EVALUATOR', 'SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List notifications for current user (paginated, unread first)' })
  async list(@CurrentUser() user: JwtPayload, @Query() filter: NotificationFilterDto) {
    return this.service.listForUser(user.sub, filter);
  }

  @Get('unread-count')
  @Roles('BUYER', 'EVENT_MANAGER', 'EVALUATOR', 'SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.service.getUnreadCount(user.sub);
  }

  @Patch(':id/read')
  @Roles('BUYER', 'EVENT_MANAGER', 'EVALUATOR', 'SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Mark a single notification as read' })
  async markRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.markRead(user.sub, id);
  }

  @Post('mark-all-read')
  @Roles('BUYER', 'EVENT_MANAGER', 'EVALUATOR', 'SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllRead(@CurrentUser() user: JwtPayload) {
    return this.service.markAllRead(user.sub);
  }

  @Get('preferences')
  @Roles('BUYER', 'EVENT_MANAGER', 'EVALUATOR', 'SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  async getPreferences(@CurrentUser() user: JwtPayload) {
    return this.service.getPreferences(user.sub);
  }

  @Put('preferences')
  @Roles('BUYER', 'EVENT_MANAGER', 'EVALUATOR', 'SUPPLIER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update notification preferences for current user' })
  async updatePreferences(@CurrentUser() user: JwtPayload, @Body() dto: UpdatePreferencesDto) {
    return this.service.updatePreferences(user.sub, dto);
  }

  @Post('reminders')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Schedule a reminder notification for a future time' })
  async scheduleReminder(@CurrentUser() user: JwtPayload, @Body() dto: ScheduleReminderDto) {
    return this.service.scheduleReminder(user.orgId!, dto);
  }
}
