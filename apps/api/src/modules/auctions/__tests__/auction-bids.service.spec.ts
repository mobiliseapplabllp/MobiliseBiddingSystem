import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuctionBidsService } from '../auction-bids.service';
import { PrismaService } from '../../../prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { AnalyticsService } from '../../../common/services/analytics.service';
import { RedisService } from '../../../common/redis/redis.service';
import { PlaceBidDto, BidHistoryFilterDto } from '../dto/auction-bid.dto';

// ── Helpers ──────────────────────────────────────────────────────────────────────

const ORG_ID = 'org-001';
const AUCTION_ID = 'auction-001';
const SUPPLIER_ID = 'supplier-001';
const INVITATION_ID = 'inv-001';
const TOKEN = 'valid-token-abc';

function makeAuction(overrides: Record<string, unknown> = {}) {
  return {
    id: AUCTION_ID,
    orgId: ORG_ID,
    refNumber: 'AUC-2026-001',
    title: 'Test Auction',
    status: 'OPEN',
    auctionType: 'ENGLISH',
    currency: 'USD',
    bidVisibility: 'RANK_ONLY',
    startAt: new Date('2026-04-01T09:00:00Z'),
    endAt: new Date(Date.now() + 3600000), // 1 hour from now
    actualEndAt: null,
    reservePrice: null,
    startingPrice: 50000,
    decrementMin: null,
    decrementMax: null,
    extensionMinutes: 5,
    extensionTriggerMinutes: 5,
    extensionCount: 0,
    maxExtensions: null,
    isActive: true,
    ...overrides,
  };
}

function makeInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: INVITATION_ID,
    auctionId: AUCTION_ID,
    orgId: ORG_ID,
    supplierId: SUPPLIER_ID,
    supplierEmail: 'supplier@test.com',
    supplierName: 'Test Supplier',
    token: TOKEN,
    status: 'PENDING',
    isActive: true,
    auction: makeAuction(),
    ...overrides,
  };
}

function makeBid(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bid-001',
    auctionId: AUCTION_ID,
    orgId: ORG_ID,
    supplierId: SUPPLIER_ID,
    invitationId: INVITATION_ID,
    bidPrice: 45000,
    currency: 'USD',
    bidNumber: 1,
    status: 'ACTIVE',
    rank: null,
    lotId: null,
    placedAt: new Date(),
    ...overrides,
  };
}

// ── Mock Factories ───────────────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    auctionInvitation: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auction: {
      update: jest.fn(),
    },
    auctionBid: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auctionExtension: {
      create: jest.fn(),
    },
  };
}

function createMockEventEmitter() {
  return { emit: jest.fn() };
}

function createMockAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function createMockAnalytics() {
  return { track: jest.fn().mockResolvedValue(undefined) };
}

function createMockRedis() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
}

// ── Test Suite ───────────────────────────────────────────────────────────────────

describe('AuctionBidsService', () => {
  let service: AuctionBidsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let eventEmitter: ReturnType<typeof createMockEventEmitter>;
  let audit: ReturnType<typeof createMockAudit>;
  let analytics: ReturnType<typeof createMockAnalytics>;
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    eventEmitter = createMockEventEmitter();
    audit = createMockAudit();
    analytics = createMockAnalytics();
    redis = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuctionBidsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: AuditService, useValue: audit },
        { provide: AnalyticsService, useValue: analytics },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<AuctionBidsService>(AuctionBidsService);
  });

  // ── placeBid() ──────────────────────────────────────────────────────────────

  describe('placeBid()', () => {
    const validDto: PlaceBidDto = {
      bidPrice: 45000,
      invitationToken: TOKEN,
    };

    function setupHappyPath() {
      prisma.auctionInvitation.findUnique.mockResolvedValue(makeInvitation());
      prisma.auctionBid.findFirst.mockResolvedValue(null); // no previous bid
      prisma.auctionBid.count.mockResolvedValue(0);
      prisma.auctionBid.create.mockResolvedValue(makeBid());
      prisma.auctionBid.findMany.mockResolvedValue([makeBid()]); // for recomputeRankings
      prisma.auctionBid.update.mockResolvedValue(makeBid({ rank: 1 }));
      prisma.auctionInvitation.update.mockResolvedValue({});
    }

    // ── Happy path ──────────────────────────────────────────────────────────

    it('creates a bid successfully on first bid for supplier', async () => {
      setupHappyPath();

      const result = await service.placeBid(validDto);

      expect(prisma.auctionBid.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          auctionId: AUCTION_ID,
          supplierId: SUPPLIER_ID,
          bidPrice: 45000,
          bidNumber: 1,
        }),
      });
      expect(result).toBeDefined();
      expect(result.rank).toBe(1);
    });

    it('assigns sequential bidNumber per supplier', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(makeInvitation());
      prisma.auctionBid.findFirst.mockResolvedValue(makeBid({ bidPrice: 48000 })); // previous bid exists
      prisma.auctionBid.count.mockResolvedValue(3); // already has 3 bids
      prisma.auctionBid.create.mockResolvedValue(makeBid({ bidNumber: 4 }));
      prisma.auctionBid.findMany.mockResolvedValue([makeBid({ bidPrice: 45000 })]);
      prisma.auctionBid.update.mockResolvedValue(makeBid({ rank: 1 }));

      await service.placeBid(validDto);

      expect(prisma.auctionBid.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ bidNumber: 4 }),
      });
    });

    it('updates invitation status to ACCEPTED on first bid', async () => {
      setupHappyPath();

      await service.placeBid(validDto);

      expect(prisma.auctionInvitation.update).toHaveBeenCalledWith({
        where: { id: INVITATION_ID },
        data: { status: 'ACCEPTED', respondedAt: expect.any(Date) },
      });
    });

    it('emits auction.bid.placed domain event', async () => {
      setupHappyPath();

      await service.placeBid(validDto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auction.bid.placed',
        expect.objectContaining({
          auctionId: AUCTION_ID,
          supplierId: SUPPLIER_ID,
          bidPrice: 45000,
        }),
      );
    });

    it('calls AuditService.log with CREATE action for bid', async () => {
      setupHappyPath();

      await service.placeBid(validDto);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: ORG_ID,
          userId: SUPPLIER_ID,
          action: 'CREATE',
          entityType: 'AUCTION_BID',
        }),
      );
    });

    it('calls AnalyticsService.track with AUCTION_BID_PLACED', async () => {
      setupHappyPath();

      await service.placeBid(validDto);

      expect(analytics.track).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AUCTION_BID_PLACED',
          entityType: 'AUCTION_BID',
          properties: expect.objectContaining({
            auctionId: AUCTION_ID,
            bidPrice: 45000,
          }),
        }),
      );
    });

    it('invalidates Redis cache after bid', async () => {
      setupHappyPath();

      await service.placeBid(validDto);

      expect(redis.del).toHaveBeenCalledWith(`auction:live:${AUCTION_ID}`);
    });

    // ── Invitation validation ───────────────────────────────────────────────

    it('rejects invalid invitation token', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(null);

      await expect(service.placeBid({ ...validDto, invitationToken: 'bad-token' }))
        .rejects.toThrow(NotFoundException);
    });

    it('rejects expired/inactive invitation', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ isActive: false }),
      );

      await expect(service.placeBid(validDto))
        .rejects.toThrow(NotFoundException);
    });

    it('rejects revoked invitation', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ status: 'REVOKED' }),
      );

      await expect(service.placeBid(validDto))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects declined invitation', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ status: 'DECLINED' }),
      );

      await expect(service.placeBid(validDto))
        .rejects.toThrow(ForbiddenException);
    });

    // ── Auction status checks ───────────────────────────────────────────────

    it('rejects bid on non-OPEN auction (DRAFT)', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ auction: makeAuction({ status: 'DRAFT' }) }),
      );

      await expect(service.placeBid(validDto))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects bid on non-OPEN auction (CLOSED)', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ auction: makeAuction({ status: 'CLOSED' }) }),
      );

      await expect(service.placeBid(validDto))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects bid on non-OPEN auction (PUBLISHED)', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ auction: makeAuction({ status: 'PUBLISHED' }) }),
      );

      await expect(service.placeBid(validDto))
        .rejects.toThrow('Auction is not open for bidding');
    });

    // ── Server-time check ───────────────────────────────────────────────────

    it('rejects bid after auction end time (server-time check)', async () => {
      const pastEndTime = new Date(Date.now() - 60000); // ended 1 minute ago
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ auction: makeAuction({ status: 'OPEN', endAt: pastEndTime }) }),
      );

      await expect(service.placeBid(validDto))
        .rejects.toThrow(ForbiddenException);
    });

    it('rejects bid after actualEndAt (extended end time)', async () => {
      const pastEndTime = new Date(Date.now() - 60000);
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({
          auction: makeAuction({
            status: 'OPEN',
            endAt: new Date(Date.now() + 3600000), // original end is in future
            actualEndAt: pastEndTime, // but actualEndAt is in the past
          }),
        }),
      );

      await expect(service.placeBid(validDto))
        .rejects.toThrow('Auction has closed');
    });

    // ── Bid improvement rule ────────────────────────────────────────────────

    it('rejects bid that does not improve (same price)', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(makeInvitation());
      prisma.auctionBid.findFirst.mockResolvedValue(makeBid({ bidPrice: 45000 }));

      await expect(service.placeBid({ ...validDto, bidPrice: 45000 }))
        .rejects.toThrow(BadRequestException);
    });

    it('rejects bid that does not improve (higher price)', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(makeInvitation());
      prisma.auctionBid.findFirst.mockResolvedValue(makeBid({ bidPrice: 45000 }));

      await expect(service.placeBid({ ...validDto, bidPrice: 46000 }))
        .rejects.toThrow('Bid must be lower than your previous bid');
    });

    // ── Decrement rules ─────────────────────────────────────────────────────

    it('rejects bid when decrease is less than decrementMin', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ auction: makeAuction({ decrementMin: 500 }) }),
      );
      prisma.auctionBid.findFirst.mockResolvedValue(makeBid({ bidPrice: 45000 }));

      // Decrease is only 100 (45000 - 44900), but min is 500
      await expect(service.placeBid({ ...validDto, bidPrice: 44900 }))
        .rejects.toThrow(BadRequestException);
    });

    it('allows bid when decrease meets decrementMin', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ auction: makeAuction({ decrementMin: 500 }) }),
      );
      prisma.auctionBid.findFirst.mockResolvedValue(makeBid({ bidPrice: 45000 }));
      prisma.auctionBid.count.mockResolvedValue(1);
      prisma.auctionBid.create.mockResolvedValue(makeBid({ bidPrice: 44000, bidNumber: 2 }));
      prisma.auctionBid.findMany.mockResolvedValue([makeBid({ bidPrice: 44000 })]);
      prisma.auctionBid.update.mockResolvedValue(makeBid({ rank: 1 }));

      const result = await service.placeBid({ ...validDto, bidPrice: 44000 });

      expect(result).toBeDefined();
    });

    it('rejects bid when decrease exceeds decrementMax', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ auction: makeAuction({ decrementMax: 2000 }) }),
      );
      prisma.auctionBid.findFirst.mockResolvedValue(makeBid({ bidPrice: 45000 }));

      // Decrease is 5000 (45000 - 40000), but max is 2000
      await expect(service.placeBid({ ...validDto, bidPrice: 40000 }))
        .rejects.toThrow(BadRequestException);
    });

    it('allows bid when decrease is within decrementMax', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({ auction: makeAuction({ decrementMax: 2000 }) }),
      );
      prisma.auctionBid.findFirst.mockResolvedValue(makeBid({ bidPrice: 45000 }));
      prisma.auctionBid.count.mockResolvedValue(1);
      prisma.auctionBid.create.mockResolvedValue(makeBid({ bidPrice: 43500, bidNumber: 2 }));
      prisma.auctionBid.findMany.mockResolvedValue([makeBid({ bidPrice: 43500 })]);
      prisma.auctionBid.update.mockResolvedValue(makeBid({ rank: 1 }));

      const result = await service.placeBid({ ...validDto, bidPrice: 43500 });

      expect(result).toBeDefined();
    });

    // ── Reserve price check ─────────────────────────────────────────────────

    it('rejects bid below reserve price in SEALED auction', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({
          auction: makeAuction({ bidVisibility: 'SEALED', reservePrice: 30000 }),
        }),
      );
      prisma.auctionBid.findFirst.mockResolvedValue(null); // no previous bid

      await expect(service.placeBid({ ...validDto, bidPrice: 25000 }))
        .rejects.toThrow('Bid does not meet reserve price');
    });

    it('allows bid at or above reserve price in SEALED auction', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({
          auction: makeAuction({ bidVisibility: 'SEALED', reservePrice: 30000 }),
        }),
      );
      prisma.auctionBid.findFirst.mockResolvedValue(null);
      prisma.auctionBid.count.mockResolvedValue(0);
      prisma.auctionBid.create.mockResolvedValue(makeBid({ bidPrice: 35000 }));
      prisma.auctionBid.findMany.mockResolvedValue([makeBid({ bidPrice: 35000 })]);
      prisma.auctionBid.update.mockResolvedValue(makeBid({ rank: 1 }));
      prisma.auctionInvitation.update.mockResolvedValue({});

      const result = await service.placeBid({ ...validDto, bidPrice: 35000 });

      expect(result).toBeDefined();
    });

    // ── Auto-extension ──────────────────────────────────────────────────────

    it('auto-extends auction when bid arrives within trigger window', async () => {
      const endingSoon = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({
          auction: makeAuction({
            endAt: endingSoon,
            extensionTriggerMinutes: 5,
            extensionMinutes: 5,
            extensionCount: 0,
            maxExtensions: null,
          }),
        }),
      );
      prisma.auctionBid.findFirst.mockResolvedValue(null);
      prisma.auctionBid.count.mockResolvedValue(0);
      prisma.auctionBid.create.mockResolvedValue(makeBid());
      prisma.auctionBid.findMany.mockResolvedValue([makeBid()]);
      prisma.auctionBid.update.mockResolvedValue(makeBid({ rank: 1 }));
      prisma.auctionInvitation.update.mockResolvedValue({});
      prisma.auction.update.mockResolvedValue({});
      prisma.auctionExtension.create.mockResolvedValue({});

      await service.placeBid(validDto);

      // Should have updated auction with new end time and created extension record
      expect(prisma.auction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: AUCTION_ID },
          data: expect.objectContaining({
            actualEndAt: expect.any(Date),
            extensionCount: 1,
          }),
        }),
      );
      expect(prisma.auctionExtension.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            auctionId: AUCTION_ID,
            extensionNumber: 1,
          }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auction.extended',
        expect.objectContaining({ auctionId: AUCTION_ID, extensionNumber: 1 }),
      );
    });

    it('does NOT auto-extend when maxExtensions is reached', async () => {
      const endingSoon = new Date(Date.now() + 2 * 60 * 1000);
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({
          auction: makeAuction({
            endAt: endingSoon,
            extensionTriggerMinutes: 5,
            extensionMinutes: 5,
            extensionCount: 3,
            maxExtensions: 3, // already at max
          }),
        }),
      );
      prisma.auctionBid.findFirst.mockResolvedValue(null);
      prisma.auctionBid.count.mockResolvedValue(0);
      prisma.auctionBid.create.mockResolvedValue(makeBid());
      prisma.auctionBid.findMany.mockResolvedValue([makeBid()]);
      prisma.auctionBid.update.mockResolvedValue(makeBid({ rank: 1 }));
      prisma.auctionInvitation.update.mockResolvedValue({});

      await service.placeBid(validDto);

      // auction.update should NOT be called for extension (only for bid rank update)
      // The extension-specific auction.update with actualEndAt should NOT happen
      expect(prisma.auctionExtension.create).not.toHaveBeenCalled();
    });

    it('does NOT auto-extend when bid is not within trigger window', async () => {
      const farFuture = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      prisma.auctionInvitation.findUnique.mockResolvedValue(
        makeInvitation({
          auction: makeAuction({
            endAt: farFuture,
            extensionTriggerMinutes: 5,
          }),
        }),
      );
      prisma.auctionBid.findFirst.mockResolvedValue(null);
      prisma.auctionBid.count.mockResolvedValue(0);
      prisma.auctionBid.create.mockResolvedValue(makeBid());
      prisma.auctionBid.findMany.mockResolvedValue([makeBid()]);
      prisma.auctionBid.update.mockResolvedValue(makeBid({ rank: 1 }));
      prisma.auctionInvitation.update.mockResolvedValue({});

      await service.placeBid(validDto);

      expect(prisma.auctionExtension.create).not.toHaveBeenCalled();
    });

    // ── Ranking ─────────────────────────────────────────────────────────────

    it('computes correct ranking after bid placement', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(makeInvitation());
      prisma.auctionBid.findFirst.mockResolvedValue(null);
      prisma.auctionBid.count.mockResolvedValue(0);
      prisma.auctionBid.create.mockResolvedValue(makeBid({ id: 'new-bid' }));
      // recomputeRankings returns bids sorted by price
      prisma.auctionBid.findMany.mockResolvedValue([
        makeBid({ id: 'other-bid', supplierId: 'supplier-002', bidPrice: 42000 }),
        makeBid({ id: 'new-bid', supplierId: SUPPLIER_ID, bidPrice: 45000 }),
      ]);
      prisma.auctionBid.update.mockResolvedValue(makeBid({ rank: 2 }));
      prisma.auctionInvitation.update.mockResolvedValue({});

      const result = await service.placeBid(validDto);

      // supplier-002 has lower price so rank 1, current supplier gets rank 2
      expect(result.rank).toBe(2);
    });
  });

  // ── getSupplierBidHistory() ────────────────────────────────────────────────

  describe('getSupplierBidHistory()', () => {
    it('returns paginated bid history for valid token', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue({
        id: INVITATION_ID,
        auctionId: AUCTION_ID,
        supplierId: SUPPLIER_ID,
        isActive: true,
      });
      const bids = [makeBid(), makeBid({ id: 'bid-002', bidNumber: 2, bidPrice: 44000 })];
      prisma.auctionBid.findMany.mockResolvedValue(bids);
      prisma.auctionBid.count.mockResolvedValue(2);

      const result = await service.getSupplierBidHistory(TOKEN, {});

      expect(result.data).toEqual(bids);
      expect(result.meta).toEqual({ total: 2, page: 1, pageSize: 20, totalPages: 1 });
    });

    it('scopes query to supplier own bids only', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue({
        id: INVITATION_ID,
        auctionId: AUCTION_ID,
        supplierId: SUPPLIER_ID,
        isActive: true,
      });
      prisma.auctionBid.findMany.mockResolvedValue([]);
      prisma.auctionBid.count.mockResolvedValue(0);

      await service.getSupplierBidHistory(TOKEN, {});

      const findManyCall = prisma.auctionBid.findMany.mock.calls[0][0];
      expect(findManyCall.where.supplierId).toBe(SUPPLIER_ID);
      expect(findManyCall.where.auctionId).toBe(AUCTION_ID);
    });

    it('throws NotFoundException for invalid token', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(null);

      await expect(service.getSupplierBidHistory('bad-token', {}))
        .rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for inactive invitation', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue({
        id: INVITATION_ID,
        isActive: false,
      });

      await expect(service.getSupplierBidHistory(TOKEN, {}))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── getSupplierLiveState() ─────────────────────────────────────────────────

  describe('getSupplierLiveState()', () => {
    it('returns supplier-scoped live state for valid token', async () => {
      const auction = makeAuction({ status: 'OPEN', endAt: new Date(Date.now() + 3600000) });
      prisma.auctionInvitation.findUnique.mockResolvedValue({
        id: INVITATION_ID,
        auctionId: AUCTION_ID,
        supplierId: SUPPLIER_ID,
        isActive: true,
        auction,
      });
      const myBids = [
        makeBid({ bidPrice: 44000 }),
        makeBid({ id: 'bid-002', bidPrice: 45000 }),
      ];
      prisma.auctionBid.findMany.mockImplementation((args: any) => {
        // First call is for supplier's own bids, second for all best bids (distinct)
        if (args.where?.supplierId) return Promise.resolve(myBids);
        return Promise.resolve([
          makeBid({ supplierId: 'other', bidPrice: 42000 }),
          makeBid({ supplierId: SUPPLIER_ID, bidPrice: 44000 }),
        ]);
      });
      prisma.auctionBid.count.mockResolvedValue(10);

      const result = await service.getSupplierLiveState(TOKEN);

      expect(result.auctionId).toBe(AUCTION_ID);
      expect(result.status).toBe('OPEN');
      expect(result.myBestPrice).toBe(44000);
      expect(result.myBidCount).toBe(2);
      expect(result.myRank).toBe(2); // second after 'other' with 42000
      expect(result.totalBids).toBe(10);
      expect(result.totalParticipants).toBe(2);
      expect(result.timeRemaining).toBeGreaterThan(0);
    });

    it('returns null myRank and myBestPrice when supplier has no bids', async () => {
      const auction = makeAuction({ status: 'OPEN' });
      prisma.auctionInvitation.findUnique.mockResolvedValue({
        id: INVITATION_ID,
        auctionId: AUCTION_ID,
        supplierId: SUPPLIER_ID,
        isActive: true,
        auction,
      });
      prisma.auctionBid.findMany.mockResolvedValue([]);
      prisma.auctionBid.count.mockResolvedValue(0);

      const result = await service.getSupplierLiveState(TOKEN);

      expect(result.myRank).toBeNull();
      expect(result.myBestPrice).toBeNull();
      expect(result.myBidCount).toBe(0);
    });

    it('throws NotFoundException for invalid token', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue(null);

      await expect(service.getSupplierLiveState('bad-token'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for inactive invitation', async () => {
      prisma.auctionInvitation.findUnique.mockResolvedValue({
        id: INVITATION_ID,
        isActive: false,
      });

      await expect(service.getSupplierLiveState(TOKEN))
        .rejects.toThrow(NotFoundException);
    });
  });
});
