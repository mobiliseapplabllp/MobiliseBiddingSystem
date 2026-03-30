import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

/**
 * AuctionExportService — generates structured data for auction result exports.
 * Actual PDF/Excel rendering deferred to Sprint 17 (Reporting Engine).
 * This service prepares the export-ready data structure.
 */

export interface AuctionExportData {
  auction: {
    refNumber: string;
    title: string;
    auctionType: string;
    status: string;
    currency: string;
    startAt: string | null;
    endAt: string | null;
    actualEndAt: string | null;
    extensionCount: number;
    totalBids: number;
    totalParticipants: number;
  };
  lots: Array<{
    lotNumber: number;
    title: string;
    lineItems: Array<{ itemNumber: number; description: string; quantity: number | null; uom: string | null }>;
  }>;
  ranking: Array<{
    rank: number;
    supplierName: string;
    bestPrice: number;
    bidCount: number;
    firstBidAt: string;
    lastBidAt: string;
  }>;
  bidHistory: Array<{
    bidNumber: number;
    supplierName: string;
    bidPrice: number;
    placedAt: string;
    rank: number | null;
  }>;
  extensions: Array<{
    extensionNumber: number;
    previousEndAt: string;
    newEndAt: string;
    createdAt: string;
  }>;
  exportedAt: string;
}

@Injectable()
export class AuctionExportService {
  private readonly logger = new Logger(AuctionExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getExportData(orgId: string, auctionId: string): Promise<AuctionExportData> {
    const auction = await this.prisma.auction.findFirst({
      where: { id: auctionId, orgId, isActive: true },
      include: {
        lots: { include: { lineItems: { orderBy: { itemNumber: 'asc' } } }, orderBy: { lotNumber: 'asc' } },
        extensions: { orderBy: { extensionNumber: 'asc' } },
      },
    });

    if (!auction) throw new NotFoundException(`Auction ${auctionId} not found`);

    // Get all bids with supplier names via invitation
    const bids = await this.prisma.auctionBid.findMany({
      where: { auctionId, status: 'ACTIVE' },
      include: { invitation: { select: { supplierName: true } } },
      orderBy: { placedAt: 'asc' },
    });

    // Compute ranking (best per supplier)
    const bestPerSupplier = new Map<string, typeof bids[0]>();
    for (const bid of bids) {
      const existing = bestPerSupplier.get(bid.supplierId);
      if (!existing || Number(bid.bidPrice) < Number(existing.bidPrice)) {
        bestPerSupplier.set(bid.supplierId, bid);
      }
    }

    const ranked = Array.from(bestPerSupplier.entries())
      .sort(([, a], [, b]) => Number(a.bidPrice) - Number(b.bidPrice))
      .map(([supplierId, bid], idx) => {
        const supplierBids = bids.filter((b) => b.supplierId === supplierId);
        return {
          rank: idx + 1,
          supplierName: bid.invitation?.supplierName ?? supplierId,
          bestPrice: Number(bid.bidPrice),
          bidCount: supplierBids.length,
          firstBidAt: supplierBids[0]?.placedAt?.toISOString() ?? '',
          lastBidAt: supplierBids[supplierBids.length - 1]?.placedAt?.toISOString() ?? '',
        };
      });

    const uniqueSuppliers = new Set(bids.map((b) => b.supplierId));

    return {
      auction: {
        refNumber: auction.refNumber,
        title: auction.title,
        auctionType: auction.auctionType,
        status: auction.status,
        currency: auction.currency,
        startAt: auction.startAt?.toISOString() ?? null,
        endAt: auction.endAt?.toISOString() ?? null,
        actualEndAt: auction.actualEndAt?.toISOString() ?? null,
        extensionCount: auction.extensionCount,
        totalBids: bids.length,
        totalParticipants: uniqueSuppliers.size,
      },
      lots: auction.lots.map((lot) => ({
        lotNumber: lot.lotNumber,
        title: lot.title,
        lineItems: lot.lineItems.map((li) => ({
          itemNumber: li.itemNumber,
          description: li.description,
          quantity: li.quantity ? Number(li.quantity) : null,
          uom: li.uom,
        })),
      })),
      ranking: ranked,
      bidHistory: bids.map((bid) => ({
        bidNumber: bid.bidNumber,
        supplierName: bid.invitation?.supplierName ?? bid.supplierId,
        bidPrice: Number(bid.bidPrice),
        placedAt: bid.placedAt.toISOString(),
        rank: bid.rank,
      })),
      extensions: auction.extensions.map((ext) => ({
        extensionNumber: ext.extensionNumber,
        previousEndAt: ext.previousEndAt.toISOString(),
        newEndAt: ext.newEndAt.toISOString(),
        createdAt: ext.createdAt.toISOString(),
      })),
      exportedAt: new Date().toISOString(),
    };
  }

  // CSV export helper
  generateCsv(data: AuctionExportData): string {
    const lines: string[] = [];

    // Header
    lines.push(`Auction Results: ${data.auction.refNumber} — ${data.auction.title}`);
    lines.push(`Status: ${data.auction.status} | Type: ${data.auction.auctionType} | Currency: ${data.auction.currency}`);
    lines.push(`Total Bids: ${data.auction.totalBids} | Participants: ${data.auction.totalParticipants} | Extensions: ${data.auction.extensionCount}`);
    lines.push('');

    // Ranking
    lines.push('FINAL RANKING');
    lines.push('Rank,Supplier,Best Price,Bid Count,First Bid,Last Bid');
    for (const r of data.ranking) {
      lines.push(`${r.rank},"${r.supplierName}",${r.bestPrice},${r.bidCount},${r.firstBidAt},${r.lastBidAt}`);
    }
    lines.push('');

    // Bid history
    lines.push('BID HISTORY');
    lines.push('Bid #,Supplier,Price,Time,Rank');
    for (const b of data.bidHistory) {
      lines.push(`${b.bidNumber},"${b.supplierName}",${b.bidPrice},${b.placedAt},${b.rank ?? ''}`);
    }

    return lines.join('\n');
  }
}
