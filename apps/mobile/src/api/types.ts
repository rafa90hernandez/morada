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

export type AuthUser = {
  id: string;
  email: string;
  status: string;
  profile?: {
    displayName?: string | null;
  } | null;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type ConversationParticipant = {
  id: string;
  profile: {
    displayName: string;
    profilePhotoUrl: string | null;
  } | null;
};

export type Conversation = {
  id: string;
  status: "ACTIVE" | "BLOCKED";
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  listing: {
    id: string;
    title: string;
    status: string;
  };
  participantA: ConversationParticipant;
  participantB: ConversationParticipant;
};

export type ConversationPage = {
  items: Conversation[];
  nextCursor: string | null;
};

export type Message = {
  id: string;
  senderId: string;
  type: "TEXT" | "IMAGE";
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

export type MessagePage = {
  items: Message[];
  nextCursor: string | null;
};

export type MessageAttachment = {
  id: string;
  type: "IMAGE" | "PDF";
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type VisitStatus =
  | "PROPOSED"
  | "ACCEPTED"
  | "DECLINED"
  | "REPLACED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export type Visit = {
  id: string;
  listingId: string;
  conversationId: string;
  requesterId: string;
  responderId: string;
  replacementForId: string | null;
  status: VisitStatus;
  startsAt: string;
  endsAt: string;
  proposedAt: string;
  respondedAt: string | null;
  cancelledAt: string | null;
  outcomeAt: string | null;
  outcomeById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VisitAcceptance = {
  visit: Visit;
  overlapWarning: boolean;
  conflicts: Array<{ id: string; startsAt: string; endsAt: string }>;
};

export type ExactVisitLocation = {
  addressLine1: string;
  addressLine2: string | null;
  eircode: string | null;
  exactLatitude: number;
  exactLongitude: number;
};

export type InAppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  targetType: "CONVERSATION" | "VISIT" | "LISTING" | "REPORT" | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPage = {
  items: InAppNotification[];
  nextCursor: string | null;
};
