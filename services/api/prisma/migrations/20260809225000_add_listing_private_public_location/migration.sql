-- AlterTable
ALTER TABLE "Listing"
ADD COLUMN "county" TEXT,
ADD COLUMN "postalDistrict" TEXT;

-- CreateTable
CREATE TABLE "ListingPrivateLocation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "eircode" TEXT,
    "exactLatitude" DOUBLE PRECISION NOT NULL,
    "exactLongitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPrivateLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingPublicLocation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "approximationVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingPublicLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listing_county_idx" ON "Listing"("county");

-- CreateIndex
CREATE INDEX "Listing_postalDistrict_idx" ON "Listing"("postalDistrict");

-- CreateIndex
CREATE UNIQUE INDEX "ListingPrivateLocation_listingId_key" ON "ListingPrivateLocation"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ListingPublicLocation_listingId_key" ON "ListingPublicLocation"("listingId");

-- CreateIndex
CREATE INDEX "ListingPublicLocation_latitude_idx" ON "ListingPublicLocation"("latitude");

-- CreateIndex
CREATE INDEX "ListingPublicLocation_longitude_idx" ON "ListingPublicLocation"("longitude");

-- AddForeignKey
ALTER TABLE "ListingPrivateLocation" ADD CONSTRAINT "ListingPrivateLocation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingPublicLocation" ADD CONSTRAINT "ListingPublicLocation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
