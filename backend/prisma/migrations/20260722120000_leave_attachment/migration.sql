-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "attachmentName" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "attachmentMime" TEXT;
