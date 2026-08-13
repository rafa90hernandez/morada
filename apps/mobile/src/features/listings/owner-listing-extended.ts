import type { OwnerListing } from "@/api/owner-listings";
import type {
  BedType,
  GenderComposition,
  HeatingType,
  KitchenAmenity,
  OutdoorAmenity,
  RoomType,
  TransportMode,
} from "./listing-field-types";

export type ExtendedOwnerListing = OwnerListing & {
  property: OwnerListing["property"] & {
    floorNumber: number | null;
    isGroundFloor: boolean | null;
    hasLift: boolean | null;
    heatingType: HeatingType | null;
  };
  space: OwnerListing["space"] & {
    roomType: RoomType | null;
    bedType: BedType | null;
    peopleSharingSpace: number | null;
    peopleSharingBathroom: number | null;
  };
  household: OwnerListing["household"] & {
    currentResidentCount: number | null;
    genderComposition: GenderComposition | null;
  };
  pricing: OwnerListing["pricing"] & {
    firstRentAdvanceCents: number | null;
    extraCostsNote: string | null;
  };
  requirements: OwnerListing["requirements"] & {
    otherRequirementsNote: string | null;
  };
  connectivity: {
    internetAvailable: boolean | null;
    wifiAvailable: boolean | null;
    internetIncludedInBills: boolean | null;
    internetSpeedMbps: number | null;
    internetProvider: string | null;
  };
  laundry: {
    washingMachine: boolean | null;
    dryer: boolean | null;
    sharedBuilding: boolean | null;
    extraCost: boolean | null;
  };
  amenities: OwnerListing["amenities"] & {
    kitchen: KitchenAmenity[];
    outdoor: OutdoorAmenity[];
  };
  parking: {
    car: boolean | null;
    motorbike: boolean | null;
    bicycle: boolean | null;
    paid: boolean | null;
    secure: boolean | null;
  };
  accessibility: {
    stepFreeAccess: boolean | null;
    accessibleEntrance: boolean | null;
    adaptedBathroom: boolean | null;
    wheelchairSpace: boolean | null;
    accessibleParking: boolean | null;
    otherNote: string | null;
  };
  rules: {
    partiesAllowed: boolean | null;
    visitorsAllowed: boolean | null;
    quietHoursNote: string | null;
    houseRules: string | null;
  };
  transport: {
    legacyInfo: string | null;
    options: Array<{
      id: string;
      mode: TransportMode;
      stopName: string | null;
      lineName: string | null;
      walkingMinutes: number | null;
      distanceMeters: number | null;
    }>;
  };
};
