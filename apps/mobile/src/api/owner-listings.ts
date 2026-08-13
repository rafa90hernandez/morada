import { API_BASE_URL } from "./client";

export type OwnerListingType = "RENTAL" | "TRANSFER";
export type OwnerListingStatus =
  "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "CLOSED" | "REJECTED";

export type ListingCloseReason =
  | "RENTED_VIA_MORADA"
  | "CLOSED_OUTSIDE_MORADA"
  | "STOPPED_ADVERTISING"
  | "PROPERTY_UNAVAILABLE"
  | "LISTING_MISTAKE"
  | "OTHER";

export type ListingAuthorizationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CORRECTION_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type ListingAuthorizationEvidenceField =
  | "tenancyAgreement"
  | "landlordAuthorization"
  | "proofOfOwnership"
  | "agencyMandate"
  | "otherSupportingDocument";

export type OwnerPropertyType =
  | "SINGLE_ROOM"
  | "SHARED_ROOM"
  | "STUDIO"
  | "APARTMENT"
  | "HOUSE"
  | "BED_SPACE"
  | "OTHER";

export type OwnerListing = {
  id: string;
  type: OwnerListingType;
  status: OwnerListingStatus;
  title: string;
  description: string;
  location: { city: string | null; area: string | null };
  property: {
    propertyType: OwnerPropertyType | null;
    occupancyType: "ENTIRE_PROPERTY" | "SHARED_PROPERTY" | null;
    bedroomCount: number | null;
    bathroomCount: number | null;
  };
  space: {
    advertisedSpaceType: "PRIVATE" | "SHARED" | null;
    bathroomType: "PRIVATE" | "SHARED" | null;
    maxOccupants: number | null;
  };
  household: {
    landlordLivesHere: boolean | null;
    couplesAllowed: boolean | null;
    childrenFamiliesAllowed: boolean | null;
    studentsAllowed: boolean | null;
    petsAllowed: boolean | null;
    smokingAllowed: boolean | null;
  };
  pricing: {
    monthlyPriceCents: number | null;
    depositAmountCents: number | null;
    billsIncludedType: "YES" | "NO" | "PARTIAL" | null;
    estimatedMonthlyBillsCents: number | null;
  };
  requirements: {
    formalContract: boolean | null;
    landlordApprovalRequired: boolean | null;
    proofOfIncomeRequired: boolean | null;
    proofOfEmploymentRequired: boolean | null;
    priorReferenceRequired: boolean | null;
  };
  availability: {
    availableFrom: string | null;
    availableUntil: string | null;
    minimumStayDays: number | null;
  };
  amenities: { furnished: boolean | null };
  photos: Array<{ id: string; url: string; position: number }>;
  moderation: {
    rejectionReason: string | null;
    pausedReason: string | null;
  };
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OwnerListingInput = {
  type: OwnerListingType;
  title: string;
  description: string;
  city?: string;
  area?: string;
  propertyType?: OwnerPropertyType;
  propertyOccupancyType?: "ENTIRE_PROPERTY" | "SHARED_PROPERTY";
  advertisedSpaceType?: "PRIVATE" | "SHARED";
  bedroomCount?: number;
  bathroomCount?: number;
  bathroomType?: "PRIVATE" | "SHARED";
  maxOccupants?: number;
  monthlyPriceCents?: number;
  depositAmountCents?: number;
  billsIncludedType?: "YES" | "NO" | "PARTIAL";
  estimatedMonthlyBillsCents?: number;
  furnished?: boolean;
  couplesAllowed?: boolean;
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  landlordLivesHere?: boolean;
  childrenFamiliesAllowed?: boolean;
  studentsAllowed?: boolean;
  formalContract?: boolean;
  landlordApprovalRequired?: boolean;
  proofOfIncomeRequired?: boolean;
  proofOfEmploymentRequired?: boolean;
  priorReferenceRequired?: boolean;
  availableFrom?: string;
  availableUntil?: string;
  minimumStayDays?: number;
};

export type OwnerListingLocationInput = {
  city: string;
  area: string;
  county: string;
  postalDistrict?: string;
  addressLine1: string;
  addressLine2?: string;
  eircode?: string;
  exactLatitude: number;
  exactLongitude: number;
};

export type OwnerListingLocation = {
  listingId: string;
  city: string | null;
  area: string | null;
  county: string | null;
  postalDistrict: string | null;
  private: {
    addressLine1: string;
    addressLine2: string | null;
    eircode: string | null;
    exactLatitude: number;
    exactLongitude: number;
  } | null;
  approximate: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    approximationVersion: string;
  } | null;
};

export type LocalImageFile = { uri: string; name: string; type: string };
export type LocalEvidenceFile = LocalImageFile;

export type ListingAuthorizationSubmission = {
  id: string;
  listingId: string;
  status: ListingAuthorizationStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewReason?: string | null;
  relationshipVerified?: boolean;
  landlordAuthorizationVerified?: boolean;
  evidence: Array<{
    id: string;
    type: string;
    mimeType: string;
    sizeBytes: number;
    originalFileName: string | null;
  }>;
};

type ApiEnvelope<T> = { success: boolean; data: T; timestamp: string };

async function request<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const error = new Error(
      `Morada API request failed with status ${response.status}.`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!envelope.success) {
    throw new Error("Morada API returned an unsuccessful response.");
  }
  return envelope.data;
}

export function listMyListings(accessToken: string) {
  return request<OwnerListing[]>("/listings/me", accessToken);
}

export function getMyListing(id: string, accessToken: string) {
  return request<OwnerListing>(
    `/listings/me/${encodeURIComponent(id)}`,
    accessToken,
  );
}

export function createListing(input: OwnerListingInput, accessToken: string) {
  return request<OwnerListing>("/listings", accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function updateListing(
  id: string,
  input: Partial<OwnerListingInput>,
  accessToken: string,
) {
  return request<OwnerListing>(
    `/listings/${encodeURIComponent(id)}`,
    accessToken,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function pauseListing(id: string, accessToken: string) {
  return request<OwnerListing>(
    `/listings/${encodeURIComponent(id)}/pause`,
    accessToken,
    { method: "POST" },
  );
}

export function reactivateListing(id: string, accessToken: string) {
  return request<OwnerListing>(
    `/listings/${encodeURIComponent(id)}/reactivate`,
    accessToken,
    { method: "POST" },
  );
}

export function resubmitListing(id: string, accessToken: string) {
  return request<OwnerListing>(
    `/listings/${encodeURIComponent(id)}/resubmit`,
    accessToken,
    { method: "POST" },
  );
}

export function renewListing(id: string, accessToken: string) {
  return request<OwnerListing>(
    `/listings/${encodeURIComponent(id)}/renew`,
    accessToken,
    { method: "POST" },
  );
}

export function closeListing(
  id: string,
  input: { reason: ListingCloseReason; detail?: string },
  accessToken: string,
) {
  return request<OwnerListing>(
    `/listings/${encodeURIComponent(id)}/close`,
    accessToken,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function setListingPrivateLocation(
  id: string,
  input: OwnerListingLocationInput,
  accessToken: string,
) {
  return request<OwnerListingLocation>(
    `/listings/me/${encodeURIComponent(id)}/location`,
    accessToken,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function getListingOwnerLocation(id: string, accessToken: string) {
  return request<OwnerListingLocation>(
    `/listings/me/${encodeURIComponent(id)}/location`,
    accessToken,
  );
}

export function uploadListingPhoto(
  id: string,
  file: LocalImageFile,
  accessToken: string,
) {
  const form = new FormData();
  form.append("file", file as unknown as Blob);
  return request<{ id: string; url: string; position: number }>(
    `/listings/${encodeURIComponent(id)}/photos`,
    accessToken,
    { method: "POST", body: form },
  );
}

export function getLatestListingAuthorization(id: string, accessToken: string) {
  return request<ListingAuthorizationSubmission | null>(
    `/listings/me/${encodeURIComponent(id)}/authorization/latest`,
    accessToken,
  );
}

export function submitListingAuthorization(
  id: string,
  evidence: Array<{
    field: ListingAuthorizationEvidenceField;
    file: LocalEvidenceFile;
  }>,
  accessToken: string,
) {
  const form = new FormData();
  for (const item of evidence) {
    form.append(item.field, item.file as unknown as Blob);
  }
  return request<ListingAuthorizationSubmission>(
    `/listings/me/${encodeURIComponent(id)}/authorization/submissions`,
    accessToken,
    { method: "POST", body: form },
  );
}
