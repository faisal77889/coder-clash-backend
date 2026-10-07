/*
  Warnings:

  - You are about to drop the column `s3_base_url` on the `Submissions` table. All the data in the column will be lost.
  - You are about to drop the column `s3_key` on the `Submissions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Submissions" DROP COLUMN "s3_base_url",
DROP COLUMN "s3_key";
