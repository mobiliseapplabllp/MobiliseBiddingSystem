import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuctionsService } from '../auctions.service';
import { PrismaService } from '../../../prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { AnalyticsService } from '../../../common/services/analytics.service';
import { RedisService } from '../../../common/redis/redis.service';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { CreateAuctionDto, UpdateAuctionDto, AuctionFilterDto, InviteSupplierDto } from '../dto/auction.dto';

// ── Helpers ──────────────────────────────────────────────────────────────────────

const ORG_ID = 'org-001';
const USER_ID = 'user-001';
const AUCTION_ID = 'auction-001';

const mockUser: JwtPayload = {
  sub: USER_ID,
  orgId: ORG_ID,
  email: 'buyer@test.com',
  roles: [{ orgId: ORG_ID, buId: null, role: 'BUYER' }],
  permissions: ['AUCTION_CREATE', 'AUCTION_VIEW', 'BID_VIEW_ALL'],
};

function makeAuction(overrides: Record<string, unknown> = {}) {
  return {
    id: AUCTION_ID,
    orgId: ORG_ID,
    refNumber: 'AUC-2026-001',
    title: 'Test Auction',
    status: 'DRAFT',
    auctionType: 'ENGLISH',
    currency: 'USD',
    isActive: true,
    createdById: USER_ID,
    extensionMinutes: 5,
    extensionTriggerMinutes: 5,
    extensionCount: 0,
    maxExtensions: null,
    bidVisibility: 'RANK_ONLY',
    startAt: new Date('2026-04-01T09:00:00Z'),
    endAt: new Date('2026-04-01T17:00:00Z'),
    actualEndAt: null,
    lots: [],
    invitations: [],
    _count: { bids: 0, extensions: 0, invitations: 0, lots: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ── Mock Factories ───────────────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    auction: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auctionInvitation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    auctionBid: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
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

describe('AuctionsService', () => {
  let service: AuctionsService;
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
        AuctionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: AuditService, useValue: audit },
        { provide: AnalyticsService, useValue: analytics },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<AuctionsService>(AuctionsService);
  });

  // ── create() ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    const dto: CreateAuctionDto = {
      title: 'Reverse Auction: Office Furniture Q3',
      description: 'Quarterly furniture sourcing',
      auctionType: 'ENGLISH' as any,
      currency: 'USD',
      startAt: '2026-04-01T09:00:00Z',
      endAt: '2026-04-01T17:00:00Z',
    };

    it('generates a sequential refNumber and creates the auction', async () => {
      prisma.auction.count.mockResolvedValue(4);
      const expected = makeAuction({ refNumber: 'AUC-2026-005' });
      prisma.auction.create.mockResolvedValue(expected);

      const result = await service.create(dto, mockUser);

      expect(prisma.auction.count).toHaveBeenCalledWith({ where: { orgId: ORG_ID } });
      expect(prisma.auction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId: ORG_ID,
            refNumber: expect.stringMatching(/^AUC-\d{4}-005$/),
            title: dto.title,
            createdById: USER_ID,
          }),
          include: { lots: { include: { lineItems: true } } },
        }),
      );
      expect(result).toEqual(expected);
    });

    it('creates auction with nested lots and line items', async () => {
      const dtoWithLots: CreateAuctionDto = {
        ...dto,
        lots: [
          {
            title: 'Lot A',
            lineItems: [
              { description: 'Steel Pipes DN100', quantity: 100, uom: 'EA' },
            ],
          },
        ],
      };
      prisma.auction.count.mockResolvedValue(0);
      prisma.auction.create.mockResolvedValue(makeAuction({ lots: [{ title: 'Lot A' }] }));

      await service.create(dtoWithLots, mockUser);

      const createCall = prisma.auction.create.mock.calls[0][0];
      expect(createCall.data.lots.create).toHaveLength(1);
      expect(createCall.data.lots.create[0].title).toBe('Lot A');
      expect(createCall.data.lots.create[0].lineItems.create).toHaveLength(1);
      expect(createCall.data.lots.create[0].lineItems.create[0].description).toBe('Steel Pipes DN100');
    });

    it('emits auction.created domain event', async () => {
      prisma.auction.count.mockResolvedValue(0);
      prisma.auction.create.mockResolvedValue(makeAuction());

      await service.create(dto, mockUser);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auction.created',
        expect.objectContaining({ auctionId: AUCTION_ID, orgId: ORG_ID }),
      );
    });

    it('calls AuditService.log with CREATE action', async () => {
      prisma.auction.count.mockResolvedValue(0);
      prisma.auction.create.mockResolvedValue(makeAuction());

      await service.create(dto, mockUser);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: ORG_ID,
          userId: USER_ID,
          action: 'CREATE',
          entityType: 'AUCTION',
          entityId: AUCTION_ID,
        }),
      );
    });

    it('calls AnalyticsService.track with AUCTION_CREATED', async () => {
      prisma.auction.count.mockResolvedValue(0);
      prisma.auction.create.mockResolvedValue(makeAuction());

      await service.create(dto, mockUser);

      expect(analytics.track).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: ORG_ID,
          userId: USER_ID,
          eventType: 'AUCTION_CREATED',
          entityType: 'AUCTION',
          entityId: AUCTION_ID,
        }),
      );
    });
  });

  // ── findAll() ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns paginated results with default pagination', async () => {
      const auctions = [makeAuction()];
      prisma.auction.findMany.mockResolvedValue(auctions);
      prisma.auction.count.mockResolvedValue(1);

      const result = await service.findAll(ORG_ID, {});

      expect(result.data).toEqual(auctions);
      expect(result.meta).toEqual({ total: 1, page: 1, pageSize: 20, totalPages: 1 });
      expect(prisma.auction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('applies status filter', async () => {
      prisma.auction.findMany.mockResolvedValue([]);
      prisma.auction.count.mockResolvedValue(0);

      await service.findAll(ORG_ID, { status: 'OPEN' as any });

      const whereArg = prisma.auction.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('OPEN');
    });

    it('applies auctionType filter', async () => {
      prisma.auction.findMany.mockResolvedValue([]);
      prisma.auction.count.mockResolvedValue(0);

      await service.findAll(ORG_ID, { auctionType: 'ENGLISH' as any });

      const whereArg = prisma.auction.findMany.mock.calls[0][0].where;
      expect(whereArg.auctionType).toBe('ENGLISH');
    });

    it('applies search filter across title and refNumber', async () => {
      prisma.auction.findMany.mockResolvedValue([]);
      prisma.auction.count.mockResolvedValue(0);

      await service.findAll(ORG_ID, { search: 'furniture' });

      const whereArg = prisma.auction.findMany.mock.calls[0][0].where;
      expect(whereArg.OR).toEqual([
        { title: { contains: 'furniture', mode: 'insensitive' } },
        { refNumber: { contains: 'furniture', mode: 'insensitive' } },
      ]);
    });

    it('computes correct totalPages', async () => {
      prisma.auction.findMany.mockResolvedValue([]);
      prisma.auction.count.mockResolvedValue(45);

      const result = await service.findAll(ORG_ID, { page: 1, pageSize: 10 });

      expect(result.meta.totalPages).toBe(5);
    });
  });

  // ── findOne() ───────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns auction with lots when found', async () => {
      const auction = makeAuction();
      prisma.auction.findFirst.mockResolvedValue(auction);

      const result = await service.findOne(ORG_ID, AUCTION_ID);

      expect(result).toEqual(auction);
      expect(prisma.auction.findFirst).toHaveBeenCalledWith({
        where: { id: AUCTION_ID, orgId: ORG_ID, isActive: true },
        include: expect.objectContaining({
          lots: expect.any(Object),
          invitations: expect.any(Object),
        }),
      });
    });

    it('throws NotFoundException when auction does not exist', async () => {
      prisma.auction.findFirst.mockResolvedValue(null);

      await expect(service.findOne(ORG_ID, 'non-existent'))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── update() ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    const updateDto: UpdateAuctionDto = { title: 'Updated Title' };

    it('updates a DRAFT auction successfully', async () => {
      const draft = makeAuction({ status: 'DRAFT' });
      prisma.auction.findFirst.mockResolvedValue(draft);
      const updated = makeAuction({ ...draft, title: 'Updated Title' });
      prisma.auction.update.mockResolvedValue(updated);

      const result = await service.update(ORG_ID, AUCTION_ID, updateDto, mockUser);

      expect(result.title).toBe('Updated Title');
      expect(prisma.auction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: AUCTION_ID },
          data: expect.objectContaining({ title: 'Updated Title' }),
        }),
      );
    });

    it('throws BadRequestException when auction is not DRAFT', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'PUBLISHED' }));

      await expect(service.update(ORG_ID, AUCTION_ID, updateDto, mockUser))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when auction is OPEN', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'OPEN' }));

      await expect(service.update(ORG_ID, AUCTION_ID, updateDto, mockUser))
        .rejects.toThrow('Only DRAFT auctions can be updated');
    });

    it('calls AuditService.log with UPDATE action', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'DRAFT' }));
      prisma.auction.update.mockResolvedValue(makeAuction({ title: 'Updated Title' }));

      await service.update(ORG_ID, AUCTION_ID, updateDto, mockUser);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          entityType: 'AUCTION',
          entityId: AUCTION_ID,
        }),
      );
    });
  });

  // ── changeStatus() ─────────────────────────────────────────────────────────

  describe('changeStatus()', () => {
    describe('valid transitions', () => {
      const transitions: Array<[string, string]> = [
        ['DRAFT', 'PUBLISHED'],
        ['PUBLISHED', 'OPEN'],
        ['OPEN', 'CLOSED'],
        ['CLOSED', 'EVALUATED'],
        ['EVALUATED', 'AWARDED'],
      ];

      it.each(transitions)(
        'allows %s -> %s',
        async (from, to) => {
          prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: from }));
          prisma.auction.update.mockResolvedValue(makeAuction({ status: to }));
          prisma.auctionBid.count.mockResolvedValue(3);

          const result = await service.changeStatus(ORG_ID, AUCTION_ID, to, mockUser);

          expect(prisma.auction.update).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { id: AUCTION_ID },
              data: expect.objectContaining({ status: to }),
            }),
          );
          expect(result.status).toBe(to);
        },
      );

      it('sets publishedAt when transitioning to PUBLISHED', async () => {
        prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'DRAFT' }));
        prisma.auction.update.mockResolvedValue(makeAuction({ status: 'PUBLISHED' }));

        await service.changeStatus(ORG_ID, AUCTION_ID, 'PUBLISHED', mockUser);

        const data = prisma.auction.update.mock.calls[0][0].data;
        expect(data.publishedAt).toBeInstanceOf(Date);
      });

      it('sets openedAt when transitioning to OPEN', async () => {
        prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'PUBLISHED' }));
        prisma.auction.update.mockResolvedValue(makeAuction({ status: 'OPEN' }));

        await service.changeStatus(ORG_ID, AUCTION_ID, 'OPEN', mockUser);

        const data = prisma.auction.update.mock.calls[0][0].data;
        expect(data.openedAt).toBeInstanceOf(Date);
      });

      it('sets closedAt and actualEndAt when transitioning to CLOSED', async () => {
        prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'OPEN' }));
        prisma.auction.update.mockResolvedValue(makeAuction({ status: 'CLOSED' }));
        prisma.auctionBid.count.mockResolvedValue(5);

        await service.changeStatus(ORG_ID, AUCTION_ID, 'CLOSED', mockUser);

        const data = prisma.auction.update.mock.calls[0][0].data;
        expect(data.closedAt).toBeInstanceOf(Date);
        expect(data.actualEndAt).toBeInstanceOf(Date);
      });
    });

    describe('invalid transitions', () => {
      const invalidTransitions: Array<[string, string]> = [
        ['DRAFT', 'OPEN'],
        ['DRAFT', 'CLOSED'],
        ['PUBLISHED', 'DRAFT'],
        ['PUBLISHED', 'CLOSED'],
        ['OPEN', 'DRAFT'],
        ['OPEN', 'PUBLISHED'],
        ['CLOSED', 'OPEN'],
        ['CLOSED', 'DRAFT'],
        ['EVALUATED', 'CLOSED'],
        ['AWARDED', 'DRAFT'],
        ['AWARDED', 'OPEN'],
        ['AWARDED', 'EVALUATED'],
      ];

      it.each(invalidTransitions)(
        'rejects %s -> %s',
        async (from, to) => {
          prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: from }));

          await expect(service.changeStatus(ORG_ID, AUCTION_ID, to, mockUser))
            .rejects.toThrow(BadRequestException);
        },
      );
    });

    it('emits auction.published event on PUBLISHED transition', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'DRAFT' }));
      prisma.auction.update.mockResolvedValue(makeAuction({ status: 'PUBLISHED' }));

      await service.changeStatus(ORG_ID, AUCTION_ID, 'PUBLISHED', mockUser);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auction.published',
        expect.objectContaining({ auctionId: AUCTION_ID }),
      );
    });

    it('emits auction.opened event on OPEN transition', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'PUBLISHED' }));
      prisma.auction.update.mockResolvedValue(makeAuction({ status: 'OPEN' }));

      await service.changeStatus(ORG_ID, AUCTION_ID, 'OPEN', mockUser);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auction.opened',
        expect.objectContaining({ auctionId: AUCTION_ID }),
      );
    });

    it('emits auction.closed event with bidCount on CLOSED transition', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'OPEN' }));
      prisma.auction.update.mockResolvedValue(makeAuction({ status: 'CLOSED' }));
      prisma.auctionBid.count.mockResolvedValue(7);

      await service.changeStatus(ORG_ID, AUCTION_ID, 'CLOSED', mockUser);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auction.closed',
        expect.objectContaining({ auctionId: AUCTION_ID, bidCount: 7 }),
      );
    });

    it('calls AuditService.log with STATUS_CHANGE action', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'DRAFT' }));
      prisma.auction.update.mockResolvedValue(makeAuction({ status: 'PUBLISHED' }));

      await service.changeStatus(ORG_ID, AUCTION_ID, 'PUBLISHED', mockUser);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STATUS_CHANGE',
          entityType: 'AUCTION',
          oldValue: { status: 'DRAFT' },
          newValue: { status: 'PUBLISHED' },
        }),
      );
    });

    it('calls AnalyticsService.track with dynamic event type', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'DRAFT' }));
      prisma.auction.update.mockResolvedValue(makeAuction({ status: 'PUBLISHED' }));

      await service.changeStatus(ORG_ID, AUCTION_ID, 'PUBLISHED', mockUser);

      expect(analytics.track).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'AUCTION_PUBLISHED',
          entityType: 'AUCTION',
          entityId: AUCTION_ID,
        }),
      );
    });
  });

  // ── remove() ────────────────────────────────────────────────────────────────

  describe('remove()', () => {
    it('soft-deletes a DRAFT auction', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'DRAFT' }));
      prisma.auction.update.mockResolvedValue({});

      await service.remove(ORG_ID, AUCTION_ID, mockUser);

      expect(prisma.auction.update).toHaveBeenCalledWith({
        where: { id: AUCTION_ID },
        data: { isActive: false },
      });
    });

    it('throws BadRequestException when auction is not DRAFT', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'OPEN' }));

      await expect(service.remove(ORG_ID, AUCTION_ID, mockUser))
        .rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for PUBLISHED auction', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'PUBLISHED' }));

      await expect(service.remove(ORG_ID, AUCTION_ID, mockUser))
        .rejects.toThrow('Only DRAFT auctions can be deleted');
    });

    it('calls AuditService.log with DELETE action', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'DRAFT' }));
      prisma.auction.update.mockResolvedValue({});

      await service.remove(ORG_ID, AUCTION_ID, mockUser);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entityType: 'AUCTION',
          entityId: AUCTION_ID,
        }),
      );
    });
  });

  // ── inviteSupplier() ────────────────────────────────────────────────────────

  describe('inviteSupplier()', () => {
    const inviteDto: InviteSupplierDto = {
      supplierId: 'supplier-001',
      supplierEmail: 'supplier@company.com',
      supplierName: 'Acme Corp',
    };

    it('creates an invitation successfully', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction());
      prisma.auctionInvitation.findFirst.mockResolvedValue(null);
      const invitation = {
        id: 'inv-001',
        auctionId: AUCTION_ID,
        orgId: ORG_ID,
        supplierId: 'supplier-001',
        supplierEmail: 'supplier@company.com',
        supplierName: 'Acme Corp',
        token: 'tok-abc-123',
        sentAt: new Date(),
      };
      prisma.auctionInvitation.create.mockResolvedValue(invitation);

      const result = await service.inviteSupplier(ORG_ID, AUCTION_ID, inviteDto, mockUser);

      expect(result).toEqual(invitation);
      expect(prisma.auctionInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            auctionId: AUCTION_ID,
            orgId: ORG_ID,
            supplierId: 'supplier-001',
            supplierEmail: 'supplier@company.com',
          }),
        }),
      );
    });

    it('rejects duplicate invitation to the same supplier', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction());
      prisma.auctionInvitation.findFirst.mockResolvedValue({
        id: 'existing-inv',
        supplierId: 'supplier-001',
      });

      await expect(service.inviteSupplier(ORG_ID, AUCTION_ID, inviteDto, mockUser))
        .rejects.toThrow(BadRequestException);
    });

    it('emits auction.invitation.sent domain event', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction());
      prisma.auctionInvitation.findFirst.mockResolvedValue(null);
      prisma.auctionInvitation.create.mockResolvedValue({
        id: 'inv-001',
        token: 'tok-abc-123',
      });

      await service.inviteSupplier(ORG_ID, AUCTION_ID, inviteDto, mockUser);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'auction.invitation.sent',
        expect.objectContaining({ auctionId: AUCTION_ID }),
      );
    });

    it('calls AuditService.log on invitation create', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction());
      prisma.auctionInvitation.findFirst.mockResolvedValue(null);
      prisma.auctionInvitation.create.mockResolvedValue({
        id: 'inv-001',
        token: 'tok-abc-123',
      });

      await service.inviteSupplier(ORG_ID, AUCTION_ID, inviteDto, mockUser);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entityType: 'AUCTION_INVITATION',
          entityId: 'inv-001',
        }),
      );
    });
  });

  // ── getLiveState() ──────────────────────────────────────────────────────────

  describe('getLiveState()', () => {
    it('returns cached result when Redis has data', async () => {
      const cachedData = { auctionId: AUCTION_ID, status: 'OPEN', totalBids: 10 };
      redis.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getLiveState(ORG_ID, AUCTION_ID);

      expect(result).toEqual(cachedData);
      expect(prisma.auction.findFirst).not.toHaveBeenCalled();
    });

    it('fetches from DB and caches when Redis has no data', async () => {
      redis.get.mockResolvedValue(null);
      const auction = makeAuction({
        status: 'OPEN',
        endAt: new Date(Date.now() + 3600000),
      });
      prisma.auction.findFirst.mockResolvedValue(auction);
      prisma.auctionBid.count.mockResolvedValue(5);
      prisma.auctionBid.groupBy.mockResolvedValue([
        { supplierId: 's1' },
        { supplierId: 's2' },
      ]);
      prisma.auctionBid.findFirst.mockResolvedValue({ bidPrice: 42000 });

      const result = await service.getLiveState(ORG_ID, AUCTION_ID);

      expect(result.auctionId).toBe(AUCTION_ID);
      expect(result.totalBids).toBe(5);
      expect(result.participatingSuppliers).toBe(2);
      expect(result.bestPrice).toBe(42000);
      expect(result.timeRemaining).toBeGreaterThan(0);
      expect(redis.set).toHaveBeenCalledWith(
        `auction:live:${AUCTION_ID}`,
        expect.any(String),
        2,
      );
    });

    it('returns null bestPrice when no bids exist', async () => {
      redis.get.mockResolvedValue(null);
      prisma.auction.findFirst.mockResolvedValue(makeAuction({ status: 'OPEN' }));
      prisma.auctionBid.count.mockResolvedValue(0);
      prisma.auctionBid.groupBy.mockResolvedValue([]);
      prisma.auctionBid.findFirst.mockResolvedValue(null);

      const result = await service.getLiveState(ORG_ID, AUCTION_ID);

      expect(result.bestPrice).toBeNull();
      expect(result.totalBids).toBe(0);
    });
  });

  // ── getRanking() ────────────────────────────────────────────────────────────

  describe('getRanking()', () => {
    it('returns suppliers ranked by best (lowest) price', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction());
      prisma.auctionBid.findMany.mockResolvedValue([
        { id: 'b1', supplierId: 's1', bidPrice: 40000, placedAt: new Date('2026-04-01T10:00:00Z'), status: 'ACTIVE' },
        { id: 'b2', supplierId: 's2', bidPrice: 42000, placedAt: new Date('2026-04-01T10:05:00Z'), status: 'ACTIVE' },
        { id: 'b3', supplierId: 's1', bidPrice: 45000, placedAt: new Date('2026-04-01T09:30:00Z'), status: 'ACTIVE' },
        { id: 'b4', supplierId: 's3', bidPrice: 38000, placedAt: new Date('2026-04-01T10:10:00Z'), status: 'ACTIVE' },
      ]);

      const result = await service.getRanking(ORG_ID, AUCTION_ID);

      expect(result).toHaveLength(3);
      expect(result[0].rank).toBe(1);
      expect(result[0].supplierId).toBe('s3');
      expect(result[0].bestPrice).toBe(38000);
      expect(result[1].rank).toBe(2);
      expect(result[1].supplierId).toBe('s1');
      expect(result[2].rank).toBe(3);
      expect(result[2].supplierId).toBe('s2');
    });

    it('includes bidCount per supplier', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction());
      prisma.auctionBid.findMany.mockResolvedValue([
        { id: 'b1', supplierId: 's1', bidPrice: 40000, placedAt: new Date(), status: 'ACTIVE' },
        { id: 'b2', supplierId: 's1', bidPrice: 45000, placedAt: new Date(), status: 'ACTIVE' },
        { id: 'b3', supplierId: 's2', bidPrice: 42000, placedAt: new Date(), status: 'ACTIVE' },
      ]);

      const result = await service.getRanking(ORG_ID, AUCTION_ID);

      expect(result[0].bidCount).toBe(2); // s1 has 2 bids
      expect(result[1].bidCount).toBe(1); // s2 has 1 bid
    });

    it('returns empty array when no bids', async () => {
      prisma.auction.findFirst.mockResolvedValue(makeAuction());
      prisma.auctionBid.findMany.mockResolvedValue([]);

      const result = await service.getRanking(ORG_ID, AUCTION_ID);

      expect(result).toEqual([]);
    });
  });
});
