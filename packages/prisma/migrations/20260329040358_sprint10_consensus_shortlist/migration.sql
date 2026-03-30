-- AlterTable
ALTER TABLE "bid_submissions" ADD COLUMN     "shortlisted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "evaluation_scores" ADD COLUMN     "isConsensus" BOOLEAN NOT NULL DEFAULT false;
