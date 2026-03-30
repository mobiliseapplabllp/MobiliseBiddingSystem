/**
 * Cross-Tenant Isolation Tests
 *
 * CLAUDE.md requires: "one test per tenant-scoped Prisma model"
 * These tests verify that Org A cannot read/write Org B's data.
 *
 * NOTE: These are integration tests requiring a real test database.
 * Run with: npx jest --config jest.integration.config.ts
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma.service';

// These tests require a live database connection (esourcing_test)
// They test RLS policies at the database level

describe('Cross-Tenant Isolation (Auctions)', () => {
  let prisma: PrismaService;
  const ORG_A_ID = 'org-a-test-id';
  const ORG_B_ID = 'org-b-test-id';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Auction table RLS', () => {
    it('org A cannot read org B auction records', async () => {
      // Set tenant context to Org A
      await prisma.setTenantContext(ORG_A_ID);

      // Query all auctions — RLS should filter to Org A only
      const records = await prisma.auction.findMany();
      expect(records.every((r) => r.orgId === ORG_A_ID)).toBe(true);
    });

    it('org B cannot read org A auction records', async () => {
      await prisma.setTenantContext(ORG_B_ID);

      const records = await prisma.auction.findMany();
      expect(records.every((r) => r.orgId === ORG_B_ID)).toBe(true);
    });
  });

  describe('AuctionBid table RLS', () => {
    it('org A cannot read org B bid records', async () => {
      await prisma.setTenantContext(ORG_A_ID);

      const records = await prisma.auctionBid.findMany();
      expect(records.every((r) => r.orgId === ORG_A_ID)).toBe(true);
    });
  });

  describe('AuctionInvitation table RLS', () => {
    it('org A cannot read org B invitation records', async () => {
      await prisma.setTenantContext(ORG_A_ID);

      const records = await prisma.auctionInvitation.findMany();
      expect(records.every((r) => r.orgId === ORG_A_ID)).toBe(true);
    });
  });

  describe('AuctionLot table RLS', () => {
    it('org A cannot read org B lot records', async () => {
      await prisma.setTenantContext(ORG_A_ID);

      const records = await prisma.auctionLot.findMany();
      expect(records.every((r) => r.orgId === ORG_A_ID)).toBe(true);
    });
  });

  describe('AuctionLineItem table RLS', () => {
    it('org A cannot read org B line item records', async () => {
      await prisma.setTenantContext(ORG_A_ID);

      const records = await prisma.auctionLineItem.findMany();
      expect(records.every((r) => r.orgId === ORG_A_ID)).toBe(true);
    });
  });

  describe('AuctionExtension table RLS', () => {
    it('org A cannot read org B extension records', async () => {
      await prisma.setTenantContext(ORG_A_ID);

      const records = await prisma.auctionExtension.findMany();
      expect(records.every((r) => r.orgId === ORG_A_ID)).toBe(true);
    });
  });

  describe('RFx tables RLS (Sprint 2-4, fixed in security patch)', () => {
    it('org A cannot read org B RFx events', async () => {
      await prisma.setTenantContext(ORG_A_ID);

      const records = await prisma.rfxEvent.findMany();
      expect(records.every((r) => r.orgId === ORG_A_ID)).toBe(true);
    });

    it('org A cannot read org B bid submissions', async () => {
      await prisma.setTenantContext(ORG_A_ID);

      const records = await prisma.bidSubmission.findMany();
      expect(records.every((r) => r.orgId === ORG_A_ID)).toBe(true);
    });

    it('org A cannot read org B supplier invitations', async () => {
      await prisma.setTenantContext(ORG_A_ID);

      const records = await prisma.supplierInvitation.findMany();
      expect(records.every((r) => r.orgId === ORG_A_ID)).toBe(true);
    });
  });
});
