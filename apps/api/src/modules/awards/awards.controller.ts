import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { AwardsService } from './awards.service';
import {
  CreateAwardDto,
  UpdateAwardDto,
  AwardFilterDto,
  ApproveRejectDto,
} from './dto/award.dto';

@ApiTags('Awards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('awards')
export class AwardsController {
  constructor(private readonly service: AwardsService) {}

  @Post()
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new award recommendation' })
  async create(@Body() dto: CreateAwardDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List awards with filters and pagination' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() filter: AwardFilterDto) {
    return this.service.findAll(user.orgId!, filter);
  }

  @Get(':awardId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get award detail with items and approval steps' })
  async findOne(@Param('awardId') awardId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(user.orgId!, awardId);
  }

  @Put(':awardId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update award (DRAFT only)' })
  async update(
    @Param('awardId') awardId: string,
    @Body() dto: UpdateAwardDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(user.orgId!, awardId, dto, user);
  }

  @Post(':awardId/submit')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Submit award for approval (DRAFT → PENDING_APPROVAL)' })
  async submitForApproval(
    @Param('awardId') awardId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.submitForApproval(user.orgId!, awardId, user);
  }

  @Post(':awardId/approve')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Approve award at your approval level' })
  async approve(
    @Param('awardId') awardId: string,
    @Body() dto: ApproveRejectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.approve(user.orgId!, awardId, dto, user);
  }

  @Post(':awardId/reject')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Reject award with reason' })
  async reject(
    @Param('awardId') awardId: string,
    @Body() dto: ApproveRejectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reject(user.orgId!, awardId, dto, user);
  }

  @Post(':awardId/notify')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Notify suppliers of award decision (APPROVED → NOTIFIED)' })
  async notifySuppliers(
    @Param('awardId') awardId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.notifySuppliers(user.orgId!, awardId, user);
  }

  @Delete(':awardId')
  @Roles('BUYER', 'EVENT_MANAGER', 'ORG_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Soft-delete award (DRAFT or CANCELLED only)' })
  async remove(
    @Param('awardId') awardId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.service.remove(user.orgId!, awardId, user);
    return { message: 'Award deleted' };
  }
}
