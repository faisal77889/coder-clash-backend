/*
  Warnings:

  - You are about to drop the column `test_id` on the `Submissions` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('passed', 'failed');

-- AlterEnum
ALTER TYPE "Status" ADD VALUE 'pending_upload';

-- DropForeignKey
ALTER TABLE "Submissions" DROP CONSTRAINT "Submissions_test_id_fkey";

-- AlterTable
ALTER TABLE "Submissions" DROP COLUMN "test_id",
ADD COLUMN     "s3_base_url" TEXT,
ADD COLUMN     "s3_key" TEXT,
ADD COLUMN     "test_passed" INTEGER,
ALTER COLUMN "status" SET DEFAULT 'pending_upload';

-- CreateTable
CREATE TABLE "SubmissionTest" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "test_id" INTEGER NOT NULL,
    "status" "TestStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionTest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SubmissionTest" ADD CONSTRAINT "SubmissionTest_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionTest" ADD CONSTRAINT "SubmissionTest_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "Tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
