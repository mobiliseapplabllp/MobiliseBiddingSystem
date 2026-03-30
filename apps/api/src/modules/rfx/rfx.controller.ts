import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RfxService } from './rfx.service';
import {
  CreateRfxEventDto, UpdateRfxEventDto, RfxFilterDto,
  CreateLotDto, CreateLineItemDto, RfxStatus, RfxType,
} from './dto/rfx.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('RFx Events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('rfx-events')
export class RfxController {
  constructor(private readonly rfxService: RfxService) {}

  @Post()
  @Roles('EVENT_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new RFx event' })
  async create(@Body() dto: CreateRfxEventDto, @CurrentUser() user: JwtPayload) {
    return this.rfxService.create(dto, user);
  }

  @Get()
  @Roles('EVENT_VIEW', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List RFx events with filters' })
  @ApiQuery({ name: 'status', enum: RfxStatus, required: false })
  @ApiQuery({ name: 'type', enum: RfxType, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  async findAll(@CurrentUser() user: JwtPayload, @Query() filter: RfxFilterDto) {
    return this.rfxService.findAll(user.orgId!, filter);
  }

  @Get(':eventId')
  @Roles('EVENT_VIEW', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get RFx event details' })
  async findOne(@Param('eventId') eventId: string, @CurrentUser() user: JwtPayload) {
    return this.rfxService.findOne(user.orgId!, eventId);
  }

  @Put(':eventId')
  @Roles('EVENT_UPDATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update RFx event (DRAFT only)' })
  async update(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateRfxEventDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rfxService.update(user.orgId!, eventId, dto, user);
  }

  @Patch(':eventId/status')
  @Roles('EVENT_PUBLISH', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Change event status (publish, close, cancel, award)' })
  async changeStatus(
    @Param('eventId') eventId: string,
    @Body('status') status: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rfxService.changeStatus(user.orgId!, eventId, status, user);
  }

  @Delete(':eventId')
  @Roles('EVENT_DELETE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Soft-delete RFx event (DRAFT only)' })
  async remove(@Param('eventId') eventId: string, @CurrentUser() user: JwtPayload) {
    await this.rfxService.remove(user.orgId!, eventId, user);
    return { message: 'Event deleted' };
  }

  @Get('deadlines/upcoming')
  @Roles('EVENT_VIEW', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get events with upcoming submission deadlines (next 30 days)' })
  async upcomingDeadlines(@CurrentUser() user: JwtPayload) {
    return this.rfxService.upcomingDeadlines(user.orgId!);
  }

  @Post(':eventId/lots')
  @Roles('EVENT_UPDATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Add a lot to an RFx event' })
  async addLot(
    @Param('eventId') eventId: string,
    @Body() dto: CreateLotDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rfxService.addLot(user.orgId!, eventId, dto, user);
  }

  @Post('lots/:lotId/items')
  @Roles('EVENT_UPDATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Add a line item to a lot' })
  async addLineItem(
    @Param('lotId') lotId: string,
    @Body() dto: CreateLineItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.rfxService.addLineItem(user.orgId!, lotId, dto, user);
  }

  // ── Auction Phase (within RFx Event) ──────────────────────────────────────

  @Post(':eventId/auction/open')
  @Roles('AUCTION_CREATE', 'AUCTION_START', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Open auction phase for this event (uses auctionConfig rules)' })
  async openAuctionPhase(@Param('eventId') eventId: string, @CurrentUser() user: JwtPayload) {
    return this.rfxService.openAuctionPhase(user.orgId!, eventId, user);
  }

  @Post(':eventId/auction/close')
  @Roles('AUCTION_CLOSE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Close auction phase for this event' })
  async closeAuctionPhase(@Param('eventId') eventId: string, @CurrentUser() user: JwtPayload) {
    return this.rfxService.closeAuctionPhase(user.orgId!, eventId, user);
  }

  @Get(':eventId/auction')
  @Roles('EVENT_VIEW', 'AUCTION_VIEW', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get auction details for this event' })
  async getAuction(@Param('eventId') eventId: string, @CurrentUser() user: JwtPayload) {
    return this.rfxService.getAuctionForEvent(user.orgId!, eventId);
  }
}
