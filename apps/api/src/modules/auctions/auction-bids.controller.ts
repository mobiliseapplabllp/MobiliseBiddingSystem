import { Controller, Post, Get, Delete, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuctionBidsService } from './auction-bids.service';
import { PlaceBidDto, BidHistoryFilterDto, SetProxyBidDto } from './dto/auction-bid.dto';

@ApiTags('Auction Bids (Supplier)')
@Controller('auction-bids')
export class AuctionBidsController {
  constructor(private readonly service: AuctionBidsService) {}

  @Post('place')
  @ApiOperation({ summary: 'Place a bid (supplier, token-based auth)' })
  async placeBid(@Body() dto: PlaceBidDto) {
    return this.service.placeBid(dto);
  }

  @Get('live')
  @ApiOperation({ summary: 'Get supplier live view (token-based)' })
  @ApiQuery({ name: 'token', required: true })
  async getSupplierLive(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Invitation token is required');
    return this.service.getSupplierLiveState(token);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get supplier bid history (token-based, scoped to own bids)' })
  @ApiQuery({ name: 'token', required: true })
  async getBidHistory(
    @Query('token') token: string,
    @Query() filter: BidHistoryFilterDto,
  ) {
    if (!token) throw new BadRequestException('Invitation token is required');
    return this.service.getSupplierBidHistory(token, filter);
  }

  // ── Proxy Bidding ───────────────────────────────────────────────────────────

  @Post('proxy')
  @ApiOperation({ summary: 'Set proxy/auto bid (min price + decrement step)' })
  async setProxyBid(@Body() dto: SetProxyBidDto) {
    return this.service.setProxyBid(dto);
  }

  @Get('proxy')
  @ApiOperation({ summary: 'Get current proxy bid settings' })
  @ApiQuery({ name: 'token', required: true })
  async getProxyBid(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Invitation token is required');
    return this.service.getProxyBid(token);
  }

  @Delete('proxy')
  @ApiOperation({ summary: 'Cancel proxy bid' })
  @ApiQuery({ name: 'token', required: true })
  async cancelProxyBid(@Query('token') token: string) {
    if (!token) throw new BadRequestException('Invitation token is required');
    return this.service.cancelProxyBid(token);
  }
}
