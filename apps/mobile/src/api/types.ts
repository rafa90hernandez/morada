export type ApproximateLocation = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  approximationVersion: string;
};

export type ListingCard = {
  id: string;
  type: "RENTAL" | "TRANSFER";
  title: string;
  location: {
    city: string | null;
    area: string | null;
    county: string | null;
    postalDistrict: string | null;
    approximate: ApproximateLocation | null;
  };
  accommodation: {
    propertyType: string | null;
    occupancyType: string | null;
    advertisedSpaceType: string | null;
    bathroomType: string | null;
    bedroomCount: number | null;
    bathroomCount: number | null;
    furnished: boolean | null;
  };
  pricing: {
    monthlyPriceCents: number | null;
    currency: "EUR";
    billsIncludedType: string | null;
  };
  suitability: {
    couplesAllowed: boolean | null;
    petsAllowed: boolean | null;
    smokingAllowed: boolean | null;
  };
  availability: {
    availableFrom: string | null;
    minimumStayDays: number | null;
  };
  coverPhoto: {
    id: string;
    url: string;
    position: number;
  } | null;
  trustScore: number;
  publishedAt: string | null;
  expiresAt: string;
};

export type ListingSearchResponse = {
  items: ListingCard[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  sort: "RELEVANCE" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST";
};

export type ListingDetail = ListingCard & {
  description: string;
  photos: Array<{ id: string; url: string; position: number }>;
  advertiser: {
    displayName: string;
    profilePhotoUrl: string | null;
    nationality: string | null;
    hometown: string | null;
  } | null;
  trust: {
    identityVerified: boolean;
    relationshipVerified: boolean;
    landlordAuthorization: {
      requiredByListing: boolean;
      status: "VERIFIED" | "NOT_VERIFIED";
    };
  };
  transport: Array<{
    id: string;
    mode: string;
    stopName: string | null;
    lineName: string | null;
    walkingMinutes: number | null;
    distanceMeters: number | null;
  }>;
};

export type MapMarker = {
  listingId: string;
  position: ApproximateLocation;
  label: {
    title: string;
    monthlyPriceCents: number | null;
    currency: "EUR";
    propertyType: string | null;
    advertisedSpaceType: string | null;
  };
};

export type MapResponse = {
  markers: MapMarker[];
  truncated: boolean;
  limit: number;
};

export type ListingSearchFilters = {
  city?: string;
  area?: string;
  maxPriceCents?: number;
  furnished?: boolean;
  couplesAllowed?: boolean;
  petsAllowed?: boolean;
  sort?: ListingSearchResponse["sort"];
};
