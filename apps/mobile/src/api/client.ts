import type {
  AuthSession,
  Conversation,
  ConversationPage,
  ExactVisitLocation,
  FavoriteListItem,
  ListingDetail,
  ListingSearchFilters,
  ListingSearchResponse,
  MapResponse,
  Message,
  MessageAttachment,
  MessagePage,
  NotificationPage,
  Visit,
  VisitAcceptance,
} from "./types";

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

type UnauthorizedHandler = () => void;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3001/api/v1";

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
}

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined,
  );
  if (entries.length === 0) return "";

  return `?${entries
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join("&")}`;
}

function hasAuthorizationHeader(headers?: HeadersInit): boolean {
  if (!headers) return false;
  return new Headers(headers).has("Authorization");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401 && hasAuthorizationHeader(init?.headers)) {
      unauthorizedHandler?.();
    }

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

function authHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export function searchListings(filters: ListingSearchFilters = {}) {
  return request<ListingSearchResponse>(
    `/discovery/listings${buildQuery({
      county: filters.county,
      city: filters.city,
      area: filters.area,
      listingType: filters.listingType,
      propertyType: filters.propertyType,
      propertyOccupancyType: filters.propertyOccupancyType,
      advertisedSpaceType: filters.advertisedSpaceType,
      bathroomType: filters.bathroomType,
      billsIncludedType: filters.billsIncludedType,
      maxPriceCents: filters.maxPriceCents,
      availableOn: filters.availableOn,
      furnished: filters.furnished,
      couplesAllowed: filters.couplesAllowed,
      petsAllowed: filters.petsAllowed,
      smokingAllowed: filters.smokingAllowed,
      childrenFamiliesAllowed: filters.childrenFamiliesAllowed,
      studentsAllowed: filters.studentsAllowed,
      bedroomCountMin: filters.bedroomCountMin,
      bathroomCountMin: filters.bathroomCountMin,
      maxMinimumStayDays: filters.maxMinimumStayDays,
      sort: filters.sort,
      page: 1,
      limit: 30,
    })}`,
  );
}

export function getListingDetail(id: string) {
  return request<ListingDetail>(
    `/discovery/listings/${encodeURIComponent(id)}`,
  );
}

export function getMapMarkers(bounds: {
  north: number;
  south: number;
  east: number;
  west: number;
  limit?: number;
}) {
  return request<MapResponse>(
    `/discovery/map${buildQuery({ ...bounds, limit: bounds.limit ?? 200 })}`,
  );
}

export function login(email: string, password: string) {
  return request<AuthSession>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function startConversation(listingId: string, accessToken: string) {
  return request<Conversation>(
    `/conversations/listings/${encodeURIComponent(listingId)}`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
    },
  );
}

export function listConversations(accessToken: string, cursor?: string) {
  return request<ConversationPage>(
    `/conversations${buildQuery({ cursor, limit: 30 })}`,
    { headers: authHeaders(accessToken) },
  );
}

export function getConversation(conversationId: string, accessToken: string) {
  return request<Conversation>(
    `/conversations/${encodeURIComponent(conversationId)}`,
    { headers: authHeaders(accessToken) },
  );
}

export function listMessages(
  conversationId: string,
  accessToken: string,
  cursor?: string,
) {
  return request<MessagePage>(
    `/conversations/${encodeURIComponent(conversationId)}/messages${buildQuery({ cursor, limit: 50 })}`,
    { headers: authHeaders(accessToken) },
  );
}

export function sendTextMessage(
  conversationId: string,
  body: string,
  accessToken: string,
) {
  return request<Message>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    },
  );
}

export function listMessageAttachments(
  conversationId: string,
  messageId: string,
  accessToken: string,
) {
  return request<MessageAttachment[]>(
    `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/attachments`,
    { headers: authHeaders(accessToken) },
  );
}

export function listVisits(accessToken: string) {
  return request<Visit[]>("/visits", {
    headers: authHeaders(accessToken),
  });
}

export function getVisit(visitId: string, accessToken: string) {
  return request<Visit>(`/visits/${encodeURIComponent(visitId)}`, {
    headers: authHeaders(accessToken),
  });
}

export function proposeVisit(
  conversationId: string,
  startsAt: string,
  endsAt: string,
  accessToken: string,
) {
  return request<Visit>(
    `/conversations/${encodeURIComponent(conversationId)}/visits`,
    {
      method: "POST",
      headers: {
        ...authHeaders(accessToken),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ startsAt, endsAt }),
    },
  );
}

export function acceptVisit(visitId: string, accessToken: string) {
  return request<VisitAcceptance>(
    `/visits/${encodeURIComponent(visitId)}/accept`,
    { method: "POST", headers: authHeaders(accessToken) },
  );
}

export function declineVisit(visitId: string, accessToken: string) {
  return request<Visit>(`/visits/${encodeURIComponent(visitId)}/decline`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function cancelVisit(visitId: string, accessToken: string) {
  return request<Visit>(`/visits/${encodeURIComponent(visitId)}/cancel`, {
    method: "POST",
    headers: authHeaders(accessToken),
  });
}

export function replaceVisit(
  visitId: string,
  startsAt: string,
  endsAt: string,
  accessToken: string,
) {
  return request<Visit>(`/visits/${encodeURIComponent(visitId)}/replacement`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ startsAt, endsAt }),
  });
}

export function recordVisitOutcome(
  visitId: string,
  outcome: "COMPLETED" | "NO_SHOW",
  accessToken: string,
) {
  return request<Visit>(`/visits/${encodeURIComponent(visitId)}/outcome`, {
    method: "POST",
    headers: {
      ...authHeaders(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ outcome }),
  });
}

export function getVisitLocation(visitId: string, accessToken: string) {
  return request<ExactVisitLocation>(
    `/visits/${encodeURIComponent(visitId)}/location`,
    { headers: authHeaders(accessToken) },
  );
}

export function listNotifications(accessToken: string, cursor?: string) {
  return request<NotificationPage>(
    `/notifications${buildQuery({ cursor, limit: 30 })}`,
    { headers: authHeaders(accessToken) },
  );
}

export function getUnreadNotificationCount(accessToken: string) {
  return request<{ count: number }>("/notifications/unread-count", {
    headers: authHeaders(accessToken),
  });
}

export function markNotificationRead(
  notificationId: string,
  accessToken: string,
) {
  return request<unknown>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH", headers: authHeaders(accessToken) },
  );
}

export function markAllNotificationsRead(accessToken: string) {
  return request<{ updated: number }>("/notifications/read-all", {
    method: "PATCH",
    headers: authHeaders(accessToken),
  });
}

export function listFavorites(accessToken: string) {
  return request<FavoriteListItem[]>("/favorites", {
    headers: authHeaders(accessToken),
  });
}

export async function addFavorite(listingId: string, accessToken: string) {
  return request<{ id: string; listingId: string; createdAt: string }>(
    `/favorites/${encodeURIComponent(listingId)}`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
    },
  );
}

export async function removeFavorite(listingId: string, accessToken: string) {
  return request<{ removed: boolean }>(
    `/favorites/${encodeURIComponent(listingId)}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
    },
  );
}

export { API_BASE_URL, buildQuery };
