-- AlterTable
ALTER TABLE "User" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "planType" TEXT DEFAULT 'none';

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "allowRegistration" BOOLEAN NOT NULL DEFAULT true,
    "businessContact" TEXT DEFAULT '',
    "priceMonthly" TEXT DEFAULT '0',
    "priceQuarterly" TEXT DEFAULT '0',
    "priceAnnual" TEXT DEFAULT '0',
    "openaiLink" TEXT DEFAULT 'https://openai.com',
    "facebookLink" TEXT DEFAULT 'https://facebook.com/autobot',
    "credits" TEXT DEFAULT 'AutoBOT AI © 2026',
    "rateLimitEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
    "loginWindowMinutes" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
