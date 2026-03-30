-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferredLocale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "preferredTheme" TEXT NOT NULL DEFAULT 'light';
