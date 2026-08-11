import type {
  ListingDetail,
  ListingSearchFilters,
  ListingSearchResponse,
  MapResponse,
} from './types';

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'http://localhost:3001/api/v1';

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined);
  if (entries.length === 0) return '';

  return `?${entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Morada API request failed with status ${response.status}.`);
  }

  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!envelope.success) {
    throw new Error('Morada API returned an unsuccessful response.');
  }

  return envelope.data;
}

export function searchListings(filters: ListingSearchFilters = {}) {
  return request<ListingSearchResponse>(
    `/discovery/listings${buildQuery({
      city: filters.city,
      area: filters.area,
      maxPriceCents: filters.maxPriceCents,
      furnished: filters.furnished,
      couplesAllowed: filters.couplesAllowed,
      petsAllowed: filters.petsAllowed,
      sort: filters.sort,
      page: 1,
      limit: 30,
    })}`,
  );
}

export function getListingDetail(id: string) {
  return request<ListingDetail>(`/discovery/listings/${encodeURIComponent(id)}`);
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

export async function addFavorite(listingId: string, accessToken: string) {
  return request<{ id: string; listingId: string; createdAt: string }>(
    `/favorites/${encodeURIComponent(listingId)}`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}

export async function removeFavorite(listingId: string, accessToken: string) {
  return request<{ removed: boolean }>(
    `/favorites/${encodeURIComponent(listingId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}

export { API_BASE_URL, buildQuery };
