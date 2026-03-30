import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import {
  AuctionBidPlacedEvent,
  AuctionExtendedEvent,
  AuctionClosedEvent,
  AuctionOpenedEvent,
} from '../../common/events/domain-events';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/auctions',
})
export class AuctionGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(AuctionGateway.name);

  @WebSocketServer()
  server: Server;

  afterInit() {
    this.logger.log('Auction WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ── Client joins an auction room to receive real-time updates ──────────────

  @SubscribeMessage('join-auction')
  handleJoinAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string },
  ) {
    const room = `auction:${data.auctionId}`;
    client.join(room);
    this.logger.debug(`Client ${client.id} joined room ${room}`);
    return { event: 'joined', room };
  }

  @SubscribeMessage('leave-auction')
  handleLeaveAuction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { auctionId: string },
  ) {
    const room = `auction:${data.auctionId}`;
    client.leave(room);
    this.logger.debug(`Client ${client.id} left room ${room}`);
    return { event: 'left', room };
  }

  // ── Domain Event Listeners — broadcast to auction rooms ────────────────────

  @OnEvent('auction.bid.placed')
  handleBidPlaced(event: AuctionBidPlacedEvent) {
    const room = `auction:${event.auctionId}`;
    this.server.to(room).emit('bid-placed', {
      bidId: event.bidId,
      auctionId: event.auctionId,
      supplierId: event.supplierId,
      bidPrice: event.bidPrice,
      rank: event.rank,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Broadcast bid-placed to room ${room}: price=${event.bidPrice}`);
  }

  @OnEvent('auction.extended')
  handleAuctionExtended(event: AuctionExtendedEvent) {
    const room = `auction:${event.auctionId}`;
    this.server.to(room).emit('auction-extended', {
      auctionId: event.auctionId,
      extensionNumber: event.extensionNumber,
      previousEndAt: event.previousEndAt.toISOString(),
      newEndAt: event.newEndAt.toISOString(),
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Broadcast auction-extended to room ${room}: ext #${event.extensionNumber}`);
  }

  @OnEvent('auction.closed')
  handleAuctionClosed(event: AuctionClosedEvent) {
    const room = `auction:${event.auctionId}`;
    this.server.to(room).emit('auction-closed', {
      auctionId: event.auctionId,
      totalBids: event.totalBids,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Broadcast auction-closed to room ${room}: ${event.totalBids} bids`);
  }

  @OnEvent('auction.opened')
  handleAuctionOpened(event: AuctionOpenedEvent) {
    const room = `auction:${event.auctionId}`;
    this.server.to(room).emit('auction-opened', {
      auctionId: event.auctionId,
      endAt: event.endAt?.toISOString(),
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Broadcast auction-opened to room ${room}`);
  }

  // ── Helper: get viewer count for an auction ────────────────────────────────

  async getViewerCount(auctionId: string): Promise<number> {
    const room = `auction:${auctionId}`;
    const sockets = await this.server.in(room).fetchSockets();
    return sockets.length;
  }
}
