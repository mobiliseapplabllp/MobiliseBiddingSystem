import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

/**
 * Auction Variant Logic
 *
 * ENGLISH (default): Reverse auction — price goes DOWN. Lowest bid wins.
 *   - Suppliers submit bids freely, must improve (lower) their previous bid.
 *   - Already implemented in AuctionBidsService.placeBid().
 *
 * DUTCH: Price starts HIGH and decreases on a timer.
 *   - System auto-decrements price at intervals.
 *   - First supplier to "accept" the current price wins that lot.
 *   - Once accepted, the lot/auction closes for that item.
 *
 * JAPANESE: Price starts HIGH and decreases in rounds.
 *   - Each round, price drops by a fixed decrement.
 *   - Suppliers must explicitly "stay in" each round or they're eliminated.
 *   - Last supplier standing wins.
 *
 * RANK_ONLY / VICKREY / MULTI_ATTRIBUTE: Sealed bid variations.
 *   - Already handled by bidVisibility settings in the base engine.
 */

export interface DutchRoundState {
  currentPrice: number;
  roundNumber: number;
  decrementPerRound: number;
  intervalSeconds: number;
  acceptedBy: string | null; // supplierId or null
}

export interface JapaneseRoundState {
  currentPrice: number;
  roundNumber: number;
  decrementPerRound: number;
  activeSuppliersCount: number;
  eliminatedSuppliers: string[];
}

@Injectable()
export class AuctionVariantsService {
  private readonly logger = new Logger(AuctionVariantsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Dutch Auction Logic ───────────────────────────────────────────────────

  async getDutchRoundState(auctionId: string): Promise<DutchRoundState> {
    const auction = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new BadRequestException('Auction not found');

    const startingPrice = Number(auction.startingPrice ?? 0);
    const decrementPerRound = Number(auction.decrementMin ?? 0);
    const intervalSeconds = auction.extensionMinutes * 60; // reuse extension minutes as round interval

    // Calculate current round based on time elapsed since auction opened
    const openedAt = auction.openedAt ? new Date(auction.openedAt).getTime() : Date.now();
    const elapsed = (Date.now() - openedAt) / 1000;
    const roundNumber = Math.floor(elapsed / intervalSeconds) + 1;
    const currentPrice = Math.max(
      Number(auction.reservePrice ?? 0),
      startingPrice - (roundNumber - 1) * decrementPerRound,
    );

    // Check if any supplier has accepted the current price
    const acceptBid = await this.prisma.auctionBid.findFirst({
      where: { auctionId, status: 'ACTIVE' },
      orderBy: { placedAt: 'asc' }, // First to accept wins
    });

    return {
      currentPrice,
      roundNumber,
      decrementPerRound,
      intervalSeconds,
      acceptedBy: acceptBid?.supplierId ?? null,
    };
  }

  validateDutchBid(currentPrice: number, bidPrice: number): void {
    // In Dutch auction, bid must exactly match the current price (accepting it)
    if (bidPrice !== currentPrice) {
      throw new BadRequestException(
        `Dutch auction: you must accept the current price of ${currentPrice}. You bid ${bidPrice}.`,
      );
    }
  }

  // ── Japanese Auction Logic ────────────────────────────────────────────────

  async getJapaneseRoundState(auctionId: string): Promise<JapaneseRoundState> {
    const auction = await this.prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new BadRequestException('Auction not found');

    const startingPrice = Number(auction.startingPrice ?? 0);
    const decrementPerRound = Number(auction.decrementMin ?? 0);

    // In Japanese auction, each bid represents "staying in" at the current price
    // Get all unique suppliers who have bid (they're "in")
    const allBids = await this.prisma.auctionBid.findMany({
      where: { auctionId, status: 'ACTIVE' },
      orderBy: { placedAt: 'desc' },
    });

    // Group by supplier, get their latest bid round
    const supplierLatestRound = new Map<string, number>();
    for (const bid of allBids) {
      if (!supplierLatestRound.has(bid.supplierId)) {
        supplierLatestRound.set(bid.supplierId, bid.bidNumber);
      }
    }

    // Current round = max bid number across all suppliers
    const roundNumber = allBids.length > 0 ? Math.max(...allBids.map((b) => b.bidNumber)) : 1;
    const currentPrice = Math.max(
      Number(auction.reservePrice ?? 0),
      startingPrice - (roundNumber - 1) * decrementPerRound,
    );

    // Suppliers who haven't bid in the current round are eliminated
    const allInvitedSuppliers = await this.prisma.auctionInvitation.findMany({
      where: { auctionId, status: 'ACCEPTED', isActive: true },
      select: { supplierId: true },
    });

    const allSupplierIds = allInvitedSuppliers.map((i) => i.supplierId);
    const eliminatedSuppliers = allSupplierIds.filter((sid) => {
      const latestRound = supplierLatestRound.get(sid) ?? 0;
      return latestRound < roundNumber - 1; // Didn't participate in previous round
    });

    const activeSuppliersCount = allSupplierIds.length - eliminatedSuppliers.length;

    return {
      currentPrice,
      roundNumber,
      decrementPerRound,
      activeSuppliersCount,
      eliminatedSuppliers,
    };
  }

  validateJapaneseBid(roundState: JapaneseRoundState, supplierId: string, bidPrice: number): void {
    // Check if supplier is eliminated
    if (roundState.eliminatedSuppliers.includes(supplierId)) {
      throw new BadRequestException('You have been eliminated from this Japanese auction');
    }

    // In Japanese auction, bid price must match the current round price (staying in)
    if (bidPrice !== roundState.currentPrice) {
      throw new BadRequestException(
        `Japanese auction: current round price is ${roundState.currentPrice}. Submit this price to stay in.`,
      );
    }
  }
}
