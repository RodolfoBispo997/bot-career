-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('CLT', 'PJ', 'INTERNSHIP', 'TRAINEE', 'COOPERATIVE', 'TEMPORARY', 'OTHER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('GUPY', 'SOLIDES', 'VAGAS', 'CATHO', 'GREENHOUSE', 'LEVER', 'WORKDAY', 'CAREER_SITE', 'OTHER');

-- CreateTable
CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT,
    "description" TEXT NOT NULL,
    "location" TEXT,
    "workMode" "WorkMode" NOT NULL DEFAULT 'UNKNOWN',
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'UNKNOWN',
    "source" "JobSource" NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_source_idx" ON "Job"("source");

-- CreateIndex
CREATE INDEX "Job_externalId_idx" ON "Job"("externalId");

-- CreateIndex
CREATE INDEX "Job_discoveredAt_idx" ON "Job"("discoveredAt");

-- CreateIndex
CREATE INDEX "Job_publishedAt_idx" ON "Job"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Job_source_externalId_key" ON "Job"("source", "externalId");
