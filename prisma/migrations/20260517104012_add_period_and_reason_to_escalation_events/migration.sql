-- AlterEnum
ALTER TYPE "EscalationLevel" ADD VALUE 'EXECUTIVE';

-- DropForeignKey
ALTER TABLE "EscalationEvent" DROP CONSTRAINT "EscalationEvent_ruleId_fkey";

-- AlterTable
ALTER TABLE "EscalationEvent" ADD COLUMN     "period" "CheckInPeriod",
ADD COLUMN     "reason" TEXT,
ALTER COLUMN "ruleId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EscalationEvent_targetUserId_period_currentLevel_key" ON "EscalationEvent"("targetUserId", "period", "currentLevel");

-- AddForeignKey
ALTER TABLE "EscalationEvent" ADD CONSTRAINT "EscalationEvent_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "EscalationRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
