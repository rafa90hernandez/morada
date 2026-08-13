import type { OwnerListingInput, OwnerPropertyType } from "@/api/owner-listings";
import type { AdvertisedSpace, BathroomType, BedType, ExtendedOwnerListingInput, GenderComposition, HeatingType, KitchenAmenity, OutdoorAmenity, PropertyOccupancy, RoomType, TransportDraft } from "./listing-field-types";
import type { ExtendedOwnerListing } from "./owner-listing-extended";

export type ListingDraft = {
  type: "RENTAL" | "TRANSFER";
  title: string;
  description: string;
  city: string;
  area: string;
  propertyType: OwnerPropertyType;
  propertyOccupancyType?: PropertyOccupancy;
  advertisedSpaceType?: AdvertisedSpace;
  bedroomCount: string;
  bathroomCount: string;
  roomType?: RoomType;
  bedType?: BedType;
  maxOccupants: string;
  peopleSharingSpace: string;
  bathroomType?: BathroomType;
  peopleSharingBathroom: string;
  currentResidentCount: string;
  householdGenderComposition?: GenderComposition;
  monthlyPrice: string;
  deposit: string;
  billsIncludedType?: "YES" | "NO" | "PARTIAL";
  estimatedMonthlyBills: string;
  firstRentAdvance: string;
  extraCostsNote: string;
  furnished: boolean;
  couplesAllowed: boolean;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  landlordLivesHere: boolean;
  childrenFamiliesAllowed: boolean;
  studentsAllowed: boolean;
  formalContract: boolean;
  landlordApprovalRequired: boolean;
  proofOfIncomeRequired: boolean;
  proofOfEmploymentRequired: boolean;
  priorReferenceRequired: boolean;
  otherRequirementsNote: string;
  availableFrom: string;
  availableUntil: string;
  minimumStayDays: string;
  floorNumber: string;
  isGroundFloor: boolean;
  hasLift: boolean;
  stepFreeAccess: boolean;
  accessibleEntrance: boolean;
  adaptedBathroom: boolean;
  wheelchairSpace: boolean;
  accessibleParking: boolean;
  accessibilityOtherNote: string;
  heatingType?: HeatingType;
  internetAvailable: boolean;
  wifiAvailable: boolean;
  internetIncludedInBills: boolean;
  internetSpeedMbps: string;
  internetProvider: string;
  washingMachine: boolean;
  dryer: boolean;
  laundrySharedBuilding: boolean;
  laundryExtraCost: boolean;
  kitchenAmenities: KitchenAmenity[];
  outdoorAmenities: OutdoorAmenity[];
  carParkingAvailable: boolean;
  motorbikeParkingAvailable: boolean;
  bicycleParkingAvailable: boolean;
  parkingPaid: boolean;
  parkingSecure: boolean;
  partiesAllowed: boolean;
  visitorsAllowed: boolean;
  quietHoursNote: string;
  houseRules: string;
  transportInfo: string;
  transportOptions: TransportDraft[];
};

export const emptyListingDraft: ListingDraft = {
  type: "RENTAL", title: "", description: "", city: "", area: "", propertyType: "SINGLE_ROOM",
  bedroomCount: "1", bathroomCount: "1", maxOccupants: "1", peopleSharingSpace: "", peopleSharingBathroom: "", currentResidentCount: "",
  monthlyPrice: "", deposit: "", estimatedMonthlyBills: "", firstRentAdvance: "", extraCostsNote: "",
  furnished: true, couplesAllowed: false, petsAllowed: false, smokingAllowed: false, landlordLivesHere: false, childrenFamiliesAllowed: false, studentsAllowed: true,
  formalContract: false, landlordApprovalRequired: false, proofOfIncomeRequired: false, proofOfEmploymentRequired: false, priorReferenceRequired: false, otherRequirementsNote: "",
  availableFrom: "", availableUntil: "", minimumStayDays: "", floorNumber: "", isGroundFloor: false, hasLift: false,
  stepFreeAccess: false, accessibleEntrance: false, adaptedBathroom: false, wheelchairSpace: false, accessibleParking: false, accessibilityOtherNote: "",
  internetAvailable: false, wifiAvailable: false, internetIncludedInBills: false, internetSpeedMbps: "", internetProvider: "",
  washingMachine: false, dryer: false, laundrySharedBuilding: false, laundryExtraCost: false,
  kitchenAmenities: [], outdoorAmenities: [], carParkingAvailable: false, motorbikeParkingAvailable: false, bicycleParkingAvailable: false, parkingPaid: false, parkingSecure: false,
  partiesAllowed: false, visitorsAllowed: false, quietHoursNote: "", houseRules: "", transportInfo: "", transportOptions: [],
};

function optionalInt(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function centsFromEuro(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : undefined;
}

function euroFromCents(value: number | null | undefined) {
  return value == null ? "" : String(value / 100);
}

function text(value: string) {
  return value.trim() || undefined;
}

export function estimatedInitialCostCents(draft: ListingDraft) {
  return (centsFromEuro(draft.deposit) ?? 0) + (centsFromEuro(draft.firstRentAdvance) ?? 0);
}

export function draftFromListing(item: ExtendedOwnerListing): ListingDraft {
  return {
    ...emptyListingDraft,
    type: item.type,
    title: item.title,
    description: item.description,
    city: item.location.city ?? "",
    area: item.location.area ?? "",
    propertyType: item.property.propertyType ?? "SINGLE_ROOM",
    propertyOccupancyType: item.property.occupancyType ?? undefined,
    advertisedSpaceType: item.space.advertisedSpaceType ?? undefined,
    bedroomCount: String(item.property.bedroomCount ?? 1),
    bathroomCount: String(item.property.bathroomCount ?? 1),
    roomType: item.space.roomType ?? undefined,
    bedType: item.space.bedType ?? undefined,
    maxOccupants: String(item.space.maxOccupants ?? 1),
    peopleSharingSpace: String(item.space.peopleSharingSpace ?? ""),
    bathroomType: item.space.bathroomType ?? undefined,
    peopleSharingBathroom: String(item.space.peopleSharingBathroom ?? ""),
    currentResidentCount: String(item.household.currentResidentCount ?? ""),
    householdGenderComposition: item.household.genderComposition ?? undefined,
    monthlyPrice: euroFromCents(item.pricing.monthlyPriceCents),
    deposit: euroFromCents(item.pricing.depositAmountCents),
    billsIncludedType: item.pricing.billsIncludedType ?? undefined,
    estimatedMonthlyBills: euroFromCents(item.pricing.estimatedMonthlyBillsCents),
    firstRentAdvance: euroFromCents(item.pricing.firstRentAdvanceCents),
    extraCostsNote: item.pricing.extraCostsNote ?? "",
    furnished: Boolean(item.amenities.furnished),
    couplesAllowed: Boolean(item.household.couplesAllowed), petsAllowed: Boolean(item.household.petsAllowed), smokingAllowed: Boolean(item.household.smokingAllowed),
    landlordLivesHere: Boolean(item.household.landlordLivesHere), childrenFamiliesAllowed: Boolean(item.household.childrenFamiliesAllowed), studentsAllowed: Boolean(item.household.studentsAllowed),
    formalContract: Boolean(item.requirements.formalContract), landlordApprovalRequired: Boolean(item.requirements.landlordApprovalRequired), proofOfIncomeRequired: Boolean(item.requirements.proofOfIncomeRequired), proofOfEmploymentRequired: Boolean(item.requirements.proofOfEmploymentRequired), priorReferenceRequired: Boolean(item.requirements.priorReferenceRequired), otherRequirementsNote: item.requirements.otherRequirementsNote ?? "",
    availableFrom: item.availability.availableFrom?.slice(0, 10) ?? "", availableUntil: item.availability.availableUntil?.slice(0, 10) ?? "", minimumStayDays: String(item.availability.minimumStayDays ?? ""),
    floorNumber: String(item.property.floorNumber ?? ""), isGroundFloor: Boolean(item.property.isGroundFloor), hasLift: Boolean(item.property.hasLift),
    stepFreeAccess: Boolean(item.accessibility.stepFreeAccess), accessibleEntrance: Boolean(item.accessibility.accessibleEntrance), adaptedBathroom: Boolean(item.accessibility.adaptedBathroom), wheelchairSpace: Boolean(item.accessibility.wheelchairSpace), accessibleParking: Boolean(item.accessibility.accessibleParking), accessibilityOtherNote: item.accessibility.otherNote ?? "",
    heatingType: item.property.heatingType ?? undefined,
    internetAvailable: Boolean(item.connectivity.internetAvailable), wifiAvailable: Boolean(item.connectivity.wifiAvailable), internetIncludedInBills: Boolean(item.connectivity.internetIncludedInBills), internetSpeedMbps: String(item.connectivity.internetSpeedMbps ?? ""), internetProvider: item.connectivity.internetProvider ?? "",
    washingMachine: Boolean(item.laundry.washingMachine), dryer: Boolean(item.laundry.dryer), laundrySharedBuilding: Boolean(item.laundry.sharedBuilding), laundryExtraCost: Boolean(item.laundry.extraCost),
    kitchenAmenities: item.amenities.kitchen, outdoorAmenities: item.amenities.outdoor,
    carParkingAvailable: Boolean(item.parking.car), motorbikeParkingAvailable: Boolean(item.parking.motorbike), bicycleParkingAvailable: Boolean(item.parking.bicycle), parkingPaid: Boolean(item.parking.paid), parkingSecure: Boolean(item.parking.secure),
    partiesAllowed: Boolean(item.rules.partiesAllowed), visitorsAllowed: Boolean(item.rules.visitorsAllowed), quietHoursNote: item.rules.quietHoursNote ?? "", houseRules: item.rules.houseRules ?? "",
    transportInfo: item.transport.legacyInfo ?? "",
    transportOptions: item.transport.options.map((option) => ({ mode: option.mode, stopName: option.stopName ?? "", lineName: option.lineName ?? "", walkingMinutes: String(option.walkingMinutes ?? "") })),
  };
}

export function inputFromDraft(draft: ListingDraft): ExtendedOwnerListingInput {
  return {
    type: draft.type, title: draft.title.trim(), description: draft.description.trim(), city: text(draft.city), area: text(draft.area), propertyType: draft.propertyType,
    propertyOccupancyType: draft.propertyOccupancyType, advertisedSpaceType: draft.advertisedSpaceType, bedroomCount: optionalInt(draft.bedroomCount), bathroomCount: optionalInt(draft.bathroomCount),
    roomType: draft.roomType, bedType: draft.bedType, maxOccupants: optionalInt(draft.maxOccupants), peopleSharingSpace: optionalInt(draft.peopleSharingSpace), bathroomType: draft.bathroomType, peopleSharingBathroom: optionalInt(draft.peopleSharingBathroom), currentResidentCount: optionalInt(draft.currentResidentCount), householdGenderComposition: draft.householdGenderComposition,
    monthlyPriceCents: centsFromEuro(draft.monthlyPrice), depositAmountCents: centsFromEuro(draft.deposit), billsIncludedType: draft.billsIncludedType, estimatedMonthlyBillsCents: centsFromEuro(draft.estimatedMonthlyBills), firstRentAdvanceCents: centsFromEuro(draft.firstRentAdvance), extraCostsNote: text(draft.extraCostsNote),
    furnished: draft.furnished, couplesAllowed: draft.couplesAllowed, petsAllowed: draft.petsAllowed, smokingAllowed: draft.smokingAllowed, landlordLivesHere: draft.landlordLivesHere, childrenFamiliesAllowed: draft.childrenFamiliesAllowed, studentsAllowed: draft.studentsAllowed,
    formalContract: draft.formalContract, landlordApprovalRequired: draft.landlordApprovalRequired, proofOfIncomeRequired: draft.proofOfIncomeRequired, proofOfEmploymentRequired: draft.proofOfEmploymentRequired, priorReferenceRequired: draft.priorReferenceRequired, otherRequirementsNote: text(draft.otherRequirementsNote),
    availableFrom: text(draft.availableFrom), availableUntil: text(draft.availableUntil), minimumStayDays: optionalInt(draft.minimumStayDays), floorNumber: optionalInt(draft.floorNumber), isGroundFloor: draft.isGroundFloor, hasLift: draft.hasLift,
    stepFreeAccess: draft.stepFreeAccess, accessibleEntrance: draft.accessibleEntrance, adaptedBathroom: draft.adaptedBathroom, wheelchairSpace: draft.wheelchairSpace, accessibleParking: draft.accessibleParking, accessibilityOtherNote: text(draft.accessibilityOtherNote), heatingType: draft.heatingType,
    internetAvailable: draft.internetAvailable, wifiAvailable: draft.wifiAvailable, internetIncludedInBills: draft.internetIncludedInBills, internetSpeedMbps: optionalInt(draft.internetSpeedMbps), internetProvider: text(draft.internetProvider),
    washingMachine: draft.washingMachine, dryer: draft.dryer, laundrySharedBuilding: draft.laundrySharedBuilding, laundryExtraCost: draft.laundryExtraCost, kitchenAmenities: draft.kitchenAmenities, outdoorAmenities: draft.outdoorAmenities,
    carParkingAvailable: draft.carParkingAvailable, motorbikeParkingAvailable: draft.motorbikeParkingAvailable, bicycleParkingAvailable: draft.bicycleParkingAvailable, parkingPaid: draft.parkingPaid, parkingSecure: draft.parkingSecure,
    partiesAllowed: draft.partiesAllowed, visitorsAllowed: draft.visitorsAllowed, quietHoursNote: text(draft.quietHoursNote), houseRules: text(draft.houseRules), transportInfo: text(draft.transportInfo),
    transportOptions: draft.transportOptions.map((option) => ({ mode: option.mode, stopName: text(option.stopName), lineName: text(option.lineName), walkingMinutes: optionalInt(option.walkingMinutes) })),
  } as OwnerListingInput & ExtendedOwnerListingInput;
}
