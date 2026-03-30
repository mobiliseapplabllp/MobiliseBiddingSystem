import { Test, TestingModule } from '@nestjs/testing';
import { AuctionsController } from '../auctions.controller';
import { AuctionBidsController } from '../auction-bids.controller';
import { AuctionsService } from '../auctions.service';
import { AuctionBidsService } from '../auction-bids.service';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';

// ── Helpers ──────────────────────────────────────────────────────────────────────

const mockUser: JwtPayload = {
  sub: 'user-001',
  orgId: 'org-001',
  email: 'buyer@test.com',
  roles: [{ orgId: 'org-001', buId: null, role: 'BUYER' }],
  permissions: ['AUCTION_CREATE', 'AUCTION_VIEW'],
};

function createMockAuctionsService() {
  return {
    create: jest.fn().mockResolvedValue({ id: 'auc-1' }),
    findAll: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
    findOne: jest.fn().mockResolvedValue({ id: 'auc-1' }),
    update: jest.fn().mockResolvedValue({ id: 'auc-1' }),
    changeStatus: jest.fn().mockResolvedValue({ id: 'auc-1', status: 'PUBLISHED' }),
    remove: jest.fn().mockResolvedValue(undefined),
    inviteSupplier: jest.fn().mockResolvedValue({ id: 'inv-1' }),
    getInvitations: jest.fn().mockResolvedValue([]),
    getLiveState: jest.fn().mockResolvedValue({ auctionId: 'auc-1' }),
    getRanking: jest.fn().mockResolvedValue([]),
  };
}

function createMockAuctionBidsService() {
  return {
    placeBid: jest.fn().mockResolvedValue({ id: 'bid-1', rank: 1 }),
    getSupplierLiveState: jest.fn().mockResolvedValue({ auctionId: 'auc-1' }),
    getSupplierBidHistory: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
  };
}

// ── Guard/Decorator metadata helpers ─────────────────────────────────────────────

function getGuards(controller: Function): Function[] {
  return Reflect.getMetadata('__guards__', controller) ?? [];
}

function getMethodGuards(controller: Function, methodName: string): Function[] {
  const descriptor = Object.getOwnPropertyDescriptor(controller.prototype, methodName);
  return Reflect.getMetadata('__guards__', descriptor?.value) ?? [];
}

function getRoles(controller: Function, methodName: string): string[] {
  const descriptor = Object.getOwnPropertyDescriptor(controller.prototype, methodName);
  return Reflect.getMetadata('roles', descriptor?.value) ?? [];
}

// ── AuctionsController Tests ─────────────────────────────────────────────────────

describe('AuctionsController', () => {
  let controller: AuctionsController;
  let service: ReturnType<typeof createMockAuctionsService>;

  beforeEach(async () => {
    service = createMockAuctionsService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuctionsController],
      providers: [
        { provide: AuctionsService, useValue: service },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuctionsController>(AuctionsController);
  });

  // ── Guard verification ──────────────────────────────────────────────────────

  describe('guards', () => {
    it('has JwtAuthGuard and RolesGuard applied at the controller level', () => {
      const guards = getGuards(AuctionsController);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });
  });

  // ── Role decorators ─────────────────────────────────────────────────────────

  describe('role decorators', () => {
    it('create() requires BUYER, ORG_ADMIN, BU_ADMIN, or PLATFORM_ADMIN', () => {
      const roles = getRoles(AuctionsController, 'create');
      expect(roles).toContain('BUYER');
      expect(roles).toContain('ORG_ADMIN');
      expect(roles).toContain('BU_ADMIN');
      expect(roles).toContain('PLATFORM_ADMIN');
    });

    it('findAll() requires BUYER, ORG_ADMIN, BU_ADMIN, or PLATFORM_ADMIN', () => {
      const roles = getRoles(AuctionsController, 'findAll');
      expect(roles).toContain('BUYER');
      expect(roles).toContain('ORG_ADMIN');
      expect(roles).toContain('BU_ADMIN');
      expect(roles).toContain('PLATFORM_ADMIN');
    });

    it('findOne() requires BUYER, ORG_ADMIN, BU_ADMIN, or PLATFORM_ADMIN', () => {
      const roles = getRoles(AuctionsController, 'findOne');
      expect(roles).toContain('BUYER');
      expect(roles).toContain('ORG_ADMIN');
      expect(roles).toContain('BU_ADMIN');
      expect(roles).toContain('PLATFORM_ADMIN');
    });

    it('update() requires BUYER, ORG_ADMIN, or PLATFORM_ADMIN (not BU_ADMIN)', () => {
      const roles = getRoles(AuctionsController, 'update');
      expect(roles).toContain('BUYER');
      expect(roles).toContain('ORG_ADMIN');
      expect(roles).toContain('PLATFORM_ADMIN');
      expect(roles).not.toContain('BU_ADMIN');
    });

    it('changeStatus() requires BUYER, ORG_ADMIN, or PLATFORM_ADMIN', () => {
      const roles = getRoles(AuctionsController, 'changeStatus');
      expect(roles).toContain('BUYER');
      expect(roles).toContain('ORG_ADMIN');
      expect(roles).toContain('PLATFORM_ADMIN');
      expect(roles).not.toContain('BU_ADMIN');
    });

    it('remove() requires BUYER, ORG_ADMIN, or PLATFORM_ADMIN', () => {
      const roles = getRoles(AuctionsController, 'remove');
      expect(roles).toContain('BUYER');
      expect(roles).toContain('ORG_ADMIN');
      expect(roles).toContain('PLATFORM_ADMIN');
    });

    it('inviteSupplier() requires BUYER, ORG_ADMIN, or PLATFORM_ADMIN', () => {
      const roles = getRoles(AuctionsController, 'inviteSupplier');
      expect(roles).toContain('BUYER');
      expect(roles).toContain('ORG_ADMIN');
      expect(roles).toContain('PLATFORM_ADMIN');
    });

    it('getInvitations() requires BUYER, ORG_ADMIN, or PLATFORM_ADMIN', () => {
      const roles = getRoles(AuctionsController, 'getInvitations');
      expect(roles).toContain('BUYER');
      expect(roles).toContain('ORG_ADMIN');
      expect(roles).toContain('PLATFORM_ADMIN');
    });

    it('getLiveState() requires BUYER, ORG_ADMIN, BU_ADMIN, or PLATFORM_ADMIN', () => {
      const roles = getRoles(AuctionsController, 'getLiveState');
      expect(roles).toContain('BUYER');
      expect(roles).toContain('ORG_ADMIN');
      expect(roles).toContain('BU_ADMIN');
      expect(roles).toContain('PLATFORM_ADMIN');
    });

    it('getRanking() requires BUYER, ORG_ADMIN, BU_ADMIN, or PLATFORM_ADMIN', () => {
      const roles = getRoles(AuctionsController, 'getRanking');
      expect(roles).toContain('BUYER');
      expect(roles).toContain('ORG_ADMIN');
      expect(roles).toContain('BU_ADMIN');
      expect(roles).toContain('PLATFORM_ADMIN');
    });
  });

  // ── Endpoint delegation ─────────────────────────────────────────────────────

  describe('endpoint delegation', () => {
    it('create() delegates to service.create()', async () => {
      const dto = { title: 'Test Auction' } as any;
      await controller.create(dto, mockUser);
      expect(service.create).toHaveBeenCalledWith(dto, mockUser);
    });

    it('findAll() delegates to service.findAll() with orgId', async () => {
      const filter = { page: 1 } as any;
      await controller.findAll(mockUser, filter);
      expect(service.findAll).toHaveBeenCalledWith('org-001', filter);
    });

    it('findOne() delegates to service.findOne() with orgId', async () => {
      await controller.findOne('auc-1', mockUser);
      expect(service.findOne).toHaveBeenCalledWith('org-001', 'auc-1');
    });

    it('update() delegates to service.update()', async () => {
      const dto = { title: 'Updated' } as any;
      await controller.update('auc-1', dto, mockUser);
      expect(service.update).toHaveBeenCalledWith('org-001', 'auc-1', dto, mockUser);
    });

    it('changeStatus() delegates to service.changeStatus()', async () => {
      const dto = { status: 'PUBLISHED' } as any;
      await controller.changeStatus('auc-1', dto, mockUser);
      expect(service.changeStatus).toHaveBeenCalledWith('org-001', 'auc-1', 'PUBLISHED', mockUser);
    });

    it('remove() delegates to service.remove() and returns message', async () => {
      const result = await controller.remove('auc-1', mockUser);
      expect(service.remove).toHaveBeenCalledWith('org-001', 'auc-1', mockUser);
      expect(result).toEqual({ message: 'Auction deleted' });
    });

    it('inviteSupplier() delegates to service.inviteSupplier()', async () => {
      const dto = { supplierId: 's1', supplierEmail: 'a@b.com', supplierName: 'Test' } as any;
      await controller.inviteSupplier('auc-1', dto, mockUser);
      expect(service.inviteSupplier).toHaveBeenCalledWith('org-001', 'auc-1', dto, mockUser);
    });

    it('getInvitations() delegates to service.getInvitations()', async () => {
      await controller.getInvitations('auc-1', mockUser);
      expect(service.getInvitations).toHaveBeenCalledWith('org-001', 'auc-1');
    });

    it('getLiveState() delegates to service.getLiveState()', async () => {
      await controller.getLiveState('auc-1', mockUser);
      expect(service.getLiveState).toHaveBeenCalledWith('org-001', 'auc-1');
    });

    it('getRanking() delegates to service.getRanking()', async () => {
      await controller.getRanking('auc-1', mockUser);
      expect(service.getRanking).toHaveBeenCalledWith('org-001', 'auc-1');
    });
  });
});

// ── AuctionBidsController Tests ──────────────────────────────────────────────────

describe('AuctionBidsController', () => {
  let controller: AuctionBidsController;
  let service: ReturnType<typeof createMockAuctionBidsService>;

  beforeEach(async () => {
    service = createMockAuctionBidsService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuctionBidsController],
      providers: [
        { provide: AuctionBidsService, useValue: service },
      ],
    }).compile();

    controller = module.get<AuctionBidsController>(AuctionBidsController);
  });

  describe('guards', () => {
    it('does NOT have JwtAuthGuard (supplier endpoints use token-based auth)', () => {
      const guards = getGuards(AuctionBidsController);
      expect(guards).not.toContain(JwtAuthGuard);
    });

    it('does NOT have RolesGuard (supplier endpoints use token-based auth)', () => {
      const guards = getGuards(AuctionBidsController);
      expect(guards).not.toContain(RolesGuard);
    });
  });

  describe('endpoint delegation', () => {
    it('placeBid() delegates to service.placeBid()', async () => {
      const dto = { bidPrice: 45000, invitationToken: 'tok-123' } as any;
      await controller.placeBid(dto);
      expect(service.placeBid).toHaveBeenCalledWith(dto);
    });

    it('getSupplierLive() delegates to service.getSupplierLiveState()', async () => {
      await controller.getSupplierLive('tok-123');
      expect(service.getSupplierLiveState).toHaveBeenCalledWith('tok-123');
    });

    it('getSupplierLive() throws BadRequestException when token is missing', async () => {
      await expect(controller.getSupplierLive('')).rejects.toThrow();
    });

    it('getBidHistory() delegates to service.getSupplierBidHistory()', async () => {
      const filter = { page: 1 } as any;
      await controller.getBidHistory('tok-123', filter);
      expect(service.getSupplierBidHistory).toHaveBeenCalledWith('tok-123', filter);
    });

    it('getBidHistory() throws BadRequestException when token is missing', async () => {
      await expect(controller.getBidHistory('', {} as any)).rejects.toThrow();
    });
  });
});
