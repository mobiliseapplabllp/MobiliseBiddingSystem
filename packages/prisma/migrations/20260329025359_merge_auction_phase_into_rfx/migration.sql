-- AlterTable
ALTER TABLE "rfx_events" ADD COLUMN     "auctionEndAt" TIMESTAMP(3),
ADD COLUMN     "auctionStartAt" TIMESTAMP(3),
ADD COLUMN     "auctionStatus" TEXT,
ADD COLUMN     "hasAuctionPhase" BOOLEAN NOT NULL DEFAULT false;
