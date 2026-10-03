/*
  Warnings:

  - You are about to drop the column `s3_base_url` on the `Tests` table. All the data in the column will be lost.
  - You are about to drop the column `s3_key` on the `Tests` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[test_name]` on the table `Tests` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `test_name` to the `Tests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Challenges" ADD COLUMN     "test_bucket_key" TEXT,
ADD COLUMN     "test_bucket_name" TEXT;

-- AlterTable
ALTER TABLE "Submissions" ADD COLUMN     "Key" TEXT,
ADD COLUMN     "bucket_name" TEXT;

-- AlterTable
ALTER TABLE "Tests" DROP COLUMN "s3_base_url",
DROP COLUMN "s3_key",
ADD COLUMN     "test_name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Tests_test_name_key" ON "Tests"("test_name");
