/*
  Warnings:

  - You are about to drop the column `file_name` on the `Tests` table. All the data in the column will be lost.
  - You are about to drop the column `folder_name` on the `Tests` table. All the data in the column will be lost.
  - Added the required column `packages` to the `Challenges` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3_base_url` to the `Tests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `s3_key` to the `Tests` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Challenges" ADD COLUMN     "packages" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tests" DROP COLUMN "file_name",
DROP COLUMN "folder_name",
ADD COLUMN     "s3_base_url" TEXT NOT NULL,
ADD COLUMN     "s3_key" TEXT NOT NULL;
