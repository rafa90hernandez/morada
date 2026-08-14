import type { OwnerListingInput } from "@/api/owner-listings";
import type {
  BedType,
  GenderComposition,
  HeatingType,
  KitchenAmenity,
  OutdoorAmenity,
  RoomType,
  TransportMode,
} from "./listing-field-enums";

export * from "./listing-field-enums";

export type TransportDraft = {
  mode: TransportMode;
  stopName: string;
  lineName: string;
  walkingMinutes: string;
};

export type ExtendedOwnerListingInput = OwnerListingInput & {
  roomType?: RoomType;
  bedType?: BedType;
  peopleSharingSpace?: number;
  peopleSharingBathroom?: number;
  currentResidentCount?: number;
  householdGenderComposition?: GenderComposition;
  firstRentAdvanceCents?: number;
  extraCostsNote?: string;
  otherRequirementsNote?: string;
  floorNumber?: number;
  isGroundFloor?: boolean;
  hasLift?: boolean;
  stepFreeAccess?: boolean;
  accessibleEntrance?: boolean;
  adaptedBathroom?: boolean;
  wheelchairSpace?: boolean;
  accessibleParking?: boolean;
  accessibilityOtherNote?: string;
  heatingType?: HeatingType;
  internetAvailable?: boolean;
  wifiAvailable?: boolean;
  internetIncludedInBills?: boolean;
  internetSpeedMbps?: number;
  internetProvider?: string;
  washingMachine?: boolean;
  dryer?: boolean;
  laundrySharedBuilding?: boolean;
  laundryExtraCost?: boolean;
  kitchenAmenities?: KitchenAmenity[];
  outdoorAmenities?: OutdoorAmenity[];
  carParkingAvailable?: boolean;
  motorbikeParkingAvailable?: boolean;
  bicycleParkingAvailable?: boolean;
  parkingPaid?: boolean;
  parkingSecure?: boolean;
  partiesAllowed?: boolean;
  visitorsAllowed?: boolean;
  quietHoursNote?: string;
  houseRules?: string;
  transportInfo?: string;
  transportOptions?: Array<{
    mode: TransportMode;
    stopName?: string;
    lineName?: string;
    walkingMinutes?: number;
  }>;
};
