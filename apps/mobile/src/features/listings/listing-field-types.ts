import type { OwnerListingInput } from "@/api/owner-listings";

export type PropertyOccupancy = "ENTIRE_PROPERTY" | "SHARED_PROPERTY";
export type AdvertisedSpace = "PRIVATE" | "SHARED";
export type RoomType = "SINGLE" | "DOUBLE" | "TWIN" | "ENSUITE" | "STUDIO" | "OTHER";
export type BedType = "SINGLE" | "DOUBLE" | "BUNK" | "TWO_SINGLE_BEDS" | "OTHER";
export type BathroomType = "PRIVATE" | "SHARED";
export type GenderComposition = "ALL_WOMEN" | "ALL_MEN" | "MIXED" | "OTHER" | "NOT_STATED";
export type HeatingType = "CENTRAL" | "GAS" | "ELECTRIC" | "HEAT_PUMP" | "OTHER" | "NOT_STATED";
export type KitchenAmenity = "FRIDGE" | "FREEZER" | "OVEN" | "HOB" | "MICROWAVE" | "DISHWASHER" | "KETTLE";
export type OutdoorAmenity = "BALCONY" | "GARDEN" | "YARD" | "TERRACE" | "SHARED_OUTDOOR_SPACE";
export type TransportMode = "BUS" | "LUAS" | "DART" | "TRAIN";

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

export const roomTypes: Array<{ value: RoomType; label: string }> = [
  { value: "SINGLE", label: "Single" },
  { value: "DOUBLE", label: "Double" },
  { value: "TWIN", label: "Twin" },
  { value: "ENSUITE", label: "En-suite" },
  { value: "STUDIO", label: "Studio" },
  { value: "OTHER", label: "Outro" },
];

export const bedTypes: Array<{ value: BedType; label: string }> = [
  { value: "SINGLE", label: "Cama single" },
  { value: "DOUBLE", label: "Cama double" },
  { value: "BUNK", label: "Beliche" },
  { value: "TWO_SINGLE_BEDS", label: "Duas camas single" },
  { value: "OTHER", label: "Outro" },
];

export const heatingTypes: Array<{ value: HeatingType; label: string }> = [
  { value: "CENTRAL", label: "Central" },
  { value: "GAS", label: "Gás" },
  { value: "ELECTRIC", label: "Elétrico" },
  { value: "HEAT_PUMP", label: "Bomba de calor" },
  { value: "OTHER", label: "Outro" },
  { value: "NOT_STATED", label: "Não informado" },
];
