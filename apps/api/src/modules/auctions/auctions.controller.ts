import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { AuctionsService } from './auctions.service';
import { AuctionExportService } from './auction-export.service';
import { AuctionVariantsService } from './auction-variants.service';
import { CreateAuctionDto, UpdateAuctionDto, ChangeAuctionStatusDto, AuctionFilterDto, InviteSupplierDto } from './dto/auction.dto';

@ApiTags('Auctions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('auctions')
export class AuctionsController {
  constructor(
    private readonly service: AuctionsService,
    private readonly exportService: AuctionExportService,
    private readonly variantsService: AuctionVariantsService,
  ) {}

  @Post()
  @Roles('AUCTION_VIEW', 'AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Create a new auction' })
  async create(@Body() dto: CreateAuctionDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles('AUCTION_VIEW', 'AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List auctions with filters' })
  async findAll(@CurrentUser() user: JwtPayload, @Query() filter: AuctionFilterDto) {
    return this.service.findAll(user.orgId!, filter);
  }

  @Get(':auctionId')
  @Roles('AUCTION_VIEW', 'AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get auction detail' })
  async findOne(@Param('auctionId') auctionId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(user.orgId!, auctionId);
  }

  @Put(':auctionId')
  @Roles('AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Update auction (DRAFT only)' })
  async update(
    @Param('auctionId') auctionId: string,
    @Body() dto: UpdateAuctionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(user.orgId!, auctionId, dto, user);
  }

  @Patch(':auctionId/status')
  @Roles('AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Change auction status (state machine)' })
  async changeStatus(
    @Param('auctionId') auctionId: string,
    @Body() dto: ChangeAuctionStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.changeStatus(user.orgId!, auctionId, dto.status, user);
  }

  @Delete(':auctionId')
  @Roles('AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Soft-delete auction (DRAFT only)' })
  async remove(@Param('auctionId') auctionId: string, @CurrentUser() user: JwtPayload) {
    await this.service.remove(user.orgId!, auctionId, user);
    return { message: 'Auction deleted' };
  }

  @Post(':auctionId/invitations')
  @Roles('AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Invite supplier to auction' })
  async inviteSupplier(
    @Param('auctionId') auctionId: string,
    @Body() dto: InviteSupplierDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.inviteSupplier(user.orgId!, auctionId, dto, user);
  }

  @Get(':auctionId/invitations')
  @Roles('AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'List auction invitations' })
  async getInvitations(@Param('auctionId') auctionId: string, @CurrentUser() user: JwtPayload) {
    return this.service.getInvitations(user.orgId!, auctionId);
  }

  @Get(':auctionId/live')
  @Roles('AUCTION_VIEW', 'AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get auction live state (polling)' })
  async getLiveState(@Param('auctionId') auctionId: string, @CurrentUser() user: JwtPayload) {
    return this.service.getLiveState(user.orgId!, auctionId);
  }

  @Get(':auctionId/ranking')
  @Roles('AUCTION_VIEW', 'AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get auction ranking' })
  async getRanking(@Param('auctionId') auctionId: string, @CurrentUser() user: JwtPayload) {
    return this.service.getRanking(user.orgId!, auctionId);
  }

  @Get(':auctionId/export')
  @Roles('AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get auction result export data (JSON)' })
  async getExportData(@Param('auctionId') auctionId: string, @CurrentUser() user: JwtPayload) {
    return this.exportService.getExportData(user.orgId!, auctionId);
  }

  @Get(':auctionId/export/csv')
  @Roles('AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get auction result export as CSV' })
  async getExportCsv(@Param('auctionId') auctionId: string, @CurrentUser() user: JwtPayload) {
    const data = await this.exportService.getExportData(user.orgId!, auctionId);
    return { csv: this.exportService.generateCsv(data), filename: `${data.auction.refNumber}-results.csv` };
  }

  @Get(':auctionId/variant-state')
  @Roles('AUCTION_VIEW', 'AUCTION_CREATE', 'PLATFORM_ADMIN')
  @ApiOperation({ summary: 'Get Dutch/Japanese auction variant round state' })
  async getVariantState(@Param('auctionId') auctionId: string) {
    // Determine auction type and return appropriate state
    const auction = await this.service.findOne('', auctionId).catch(() => null);
    if (!auction) return { error: 'Auction not found' };

    if (auction.auctionType === 'DUTCH') {
      return { type: 'DUTCH', state: await this.variantsService.getDutchRoundState(auctionId) };
    } else if (auction.auctionType === 'JAPANESE') {
      return { type: 'JAPANESE', state: await this.variantsService.getJapaneseRoundState(auctionId) };
    }
    return { type: auction.auctionType, state: null };
  }
}
