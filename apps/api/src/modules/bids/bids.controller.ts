import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BidsService } from './bids.service';
import { CreateBidDto, UpdateBidDto } from './dto/bid.dto';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('Bids')
@Controller()
export class BidsController {
  constructor(private readonly service: BidsService) {}

  // ── Supplier portal (token-based, no auth required) ───────────────────────

  @Post('supplier/bids')
  @ApiOperation({ summary: 'Create a bid draft (supplier portal)' })
  @ApiQuery({ name: 'token', required: true, description: 'Invitation token' })
  async createDraft(@Body() dto: CreateBidDto) {
    return this.service.createDraft(dto);
  }

  @Post('supplier/bids/:bidId/submit')
  @ApiOperation({ summary: 'Submit a bid (supplier portal)' })
  @ApiQuery({ name: 'token', required: true, description: 'Invitation token' })
  async submit(
    @Param('bidId') bidId: string,
    @Query('token') token: string,
  ) {
    return this.service.submit(bidId, token);
  }

  @Put('supplier/bids/:bidId')
  @ApiOperation({ summary: 'Amend a bid (supplier portal)' })
  @ApiQuery({ name: 'token', required: true, description: 'Invitation token' })
  async amend(
    @Param('bidId') bidId: string,
    @Query('token') token: string,
    @Body() dto: UpdateBidDto,
  ) {
    return this.service.amend(bidId, token, dto);
  }

  @Delete('supplier/bids/:bidId')
  @ApiOperation({ summary: 'Withdraw a bid (supplier portal)' })
  @ApiQuery({ name: 'token', required: true, description: 'Invitation token' })
  async withdraw(
    @Param('bidId') bidId: string,
    @Query('token') token: string,
  ) {
    return this.service.withdraw(bidId, token);
  }

  @Get('supplier/bids')
  @ApiOperation({ summary: "List supplier's own bids (supplier portal)" })
  @ApiQuery({ name: 'token', required: true, description: 'Invitation token' })
  async getMyBids(@Query('token') token: string) {
    return this.service.getMyBids(token);
  }

  // ── Buyer routes (authenticated) ──────────────────────────────────────────

  @Get('rfx-events/:eventId/bids')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BUYER', 'ORG_ADMIN', 'BU_ADMIN', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List all submitted bids for an event (buyer view)' })
  async listForEvent(
    @Param('eventId') eventId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.listForEvent(user.orgId!, eventId);
  }
}
