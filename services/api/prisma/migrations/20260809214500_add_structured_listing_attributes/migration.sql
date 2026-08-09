-- CreateEnum
CREATE TYPE "PropertyOccupancyType" AS ENUM ('ENTIRE_PROPERTY', 'SHARED_PROPERTY');

-- CreateEnum
CREATE TYPE "AdvertisedSpaceType" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('SINGLE', 'DOUBLE', 'TWIN', 'ENSUITE', 'STUDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('SINGLE', 'DOUBLE', 'BUNK', 'TWO_SINGLE_BEDS', 'OTHER');

-- CreateEnum
CREATE TYPE "BathroomType" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "HouseholdGenderComposition" AS ENUM ('ALL_WOMEN', 'ALL_MEN', 'MIXED', 'OTHER', 'NOT_STATED');

-- CreateEnum
CREATE TYPE "HeatingType" AS ENUM ('CENTRAL', 'GAS', 'ELECTRIC', 'HEAT_PUMP', 'OTHER', 'NOT_STATED');

-- CreateEnum
CREATE TYPE "KitchenAmenity" AS ENUM ('FRIDGE', 'FREEZER', 'OVEN', 'HOB', 'MICROWAVE', 'DISHWASHER', 'KETTLE');

-- CreateEnum
CREATE TYPE "OutdoorAmenity" AS ENUM ('BALCONY', 'GARDEN', 'YARD', 'TERRACE', 'SHARED_OUTDOOR_SPACE');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('BUS', 'LUAS', 'DART', 'TRAIN');

-- AlterTable
ALTER TABLE "Listing"
ADD COLUMN "propertyOccupancyType" "PropertyOccupancyType",
ADD COLUMN "advertisedSpaceType" "AdvertisedSpaceType",
ADD COLUMN "bedroomCount" INTEGER,
ADD COLUMN "bathroomCount" INTEGER,
ADD COLUMN "roomType" "RoomType",
ADD COLUMN "bedType" "BedType",
ADD COLUMN "maxOccupants" INTEGER,
ADD COLUMN "peopleSharingSpace" INTEGER,
ADD COLUMN "bathroomType" "BathroomType",
ADD COLUMN "peopleSharingBathroom" INTEGER,
ADD COLUMN "currentResidentCount" INTEGER,
ADD COLUMN "householdGenderComposition" "HouseholdGenderComposition",
ADD COLUMN "estimatedMonthlyBillsCents" INTEGER,
ADD COLUMN "firstRentAdvanceCents" INTEGER,
ADD COLUMN "childrenFamiliesAllowed" BOOLEAN,
ADD COLUMN "studentsAllowed" BOOLEAN,
ADD COLUMN "proofOfIncomeRequired" BOOLEAN,
ADD COLUMN "proofOfEmploymentRequired" BOOLEAN,
ADD COLUMN "priorReferenceRequired" BOOLEAN,
ADD COLUMN "otherRequirementsNote" TEXT,
ADD COLUMN "minimumStayDays" INTEGER,
ADD COLUMN "floorNumber" INTEGER,
ADD COLUMN "isGroundFloor" BOOLEAN,
ADD COLUMN "hasLift" BOOLEAN,
ADD COLUMN "stepFreeAccess" BOOLEAN,
ADD COLUMN "accessibleEntrance" BOOLEAN,
ADD COLUMN "adaptedBathroom" BOOLEAN,
ADD COLUMN "wheelchairSpace" BOOLEAN,
ADD COLUMN "accessibleParking" BOOLEAN,
ADD COLUMN "accessibilityOtherNote" TEXT,
ADD COLUMN "heatingType" "HeatingType",
ADD COLUMN "internetAvailable" BOOLEAN,
ADD COLUMN "wifiAvailable" BOOLEAN,
ADD COLUMN "internetIncludedInBills" BOOLEAN,
ADD COLUMN "internetSpeedMbps" INTEGER,
ADD COLUMN "internetProvider" TEXT,
ADD COLUMN "washingMachine" BOOLEAN,
ADD COLUMN "dryer" BOOLEAN,
ADD COLUMN "laundrySharedBuilding" BOOLEAN,
ADD COLUMN "laundryExtraCost" BOOLEAN,
ADD COLUMN "kitchenAmenities" "KitchenAmenity"[] NOT NULL DEFAULT ARRAY[]::"KitchenAmenity"[],
ADD COLUMN "outdoorAmenities" "OutdoorAmenity"[] NOT NULL DEFAULT ARRAY[]::"OutdoorAmenity"[],
ADD COLUMN "carParkingAvailable" BOOLEAN,
ADD COLUMN "motorbikeParkingAvailable" BOOLEAN,
ADD COLUMN "bicycleParkingAvailable" BOOLEAN,
ADD COLUMN "parkingPaid" BOOLEAN,
ADD COLUMN "parkingSecure" BOOLEAN,
ADD COLUMN "partiesAllowed" BOOLEAN,
ADD COLUMN "visitorsAllowed" BOOLEAN,
ADD COLUMN "quietHoursNote" TEXT;

-- CreateTable
CREATE TABLE "ListingTransportOption" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "mode" "TransportMode" NOT NULL,
    "stopName" TEXT,
    "lineName" TEXT,
    "walkingMinutes" INTEGER,
    "distanceMeters" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingTransportOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Listing_propertyOccupancyType_idx" ON "Listing"("propertyOccupancyType");

-- CreateIndex
CREATE INDEX "Listing_advertisedSpaceType_idx" ON "Listing"("advertisedSpaceType");

-- CreateIndex
CREATE INDEX "Listing_bedroomCount_idx" ON "Listing"("bedroomCount");

-- CreateIndex
CREATE INDEX "Listing_bathroomCount_idx" ON "Listing"("bathroomCount");

-- CreateIndex
CREATE INDEX "Listing_minimumStayDays_idx" ON "Listing"("minimumStayDays");

-- CreateIndex
CREATE INDEX "ListingTransportOption_listingId_idx" ON "ListingTransportOption"("listingId");

-- CreateIndex
CREATE INDEX "ListingTransportOption_mode_idx" ON "ListingTransportOption"("mode");

-- CreateIndex
CREATE INDEX "ListingTransportOption_listingId_mode_idx" ON "ListingTransportOption"("listingId", "mode");

-- AddForeignKey
ALTER TABLE "ListingTransportOption" ADD CONSTRAINT "ListingTransportOption_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
