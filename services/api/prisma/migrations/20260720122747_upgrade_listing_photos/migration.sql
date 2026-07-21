/*
  Warnings:

  - You are about to drop the column `publicId` on the `ListingPhoto` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[objectKey]` on the table `ListingPhoto` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[listingId,position]` on the table `ListingPhoto` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `height` to the `ListingPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `ListingPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `objectKey` to the `ListingPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sizeBytes` to the `ListingPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ListingPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `ListingPhoto` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ListingPhoto_listingId_idx";

-- AlterTable
ALTER TABLE "ListingPhoto" DROP COLUMN "publicId",
ADD COLUMN     "height" INTEGER NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "objectKey" TEXT NOT NULL,
ADD COLUMN     "sizeBytes" INTEGER NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "width" INTEGER NOT NULL,
ALTER COLUMN "position" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "ListingPhoto_objectKey_key" ON "ListingPhoto"("objectKey");

-- CreateIndex
CREATE INDEX "ListingPhoto_listingId_position_idx" ON "ListingPhoto"("listingId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ListingPhoto_listingId_position_key" ON "ListingPhoto"("listingId", "position");
