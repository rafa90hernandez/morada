import type { ListingCard } from '@/api/types';

const DEFAULT_DUBLIN_BOUNDS = {
  north: 53.5,
  south: 53.2,
  east: -6.05,
  west: -6.55,
} as const;

export function boundsFromCards(cards: ListingCard[]) {
  const points = cards
    .map((card) => card.location.approximate)
    .filter((point): point is NonNullable<typeof point> => point !== null);

  if (points.length === 0) return DEFAULT_DUBLIN_BOUNDS;

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const padding = 0.04;

  return {
    north: Math.min(90, Math.max(...latitudes) + padding),
    south: Math.max(-90, Math.min(...latitudes) - padding),
    east: Math.min(180, Math.max(...longitudes) + padding),
    west: Math.max(-180, Math.min(...longitudes) - padding),
  };
}

export { DEFAULT_DUBLIN_BOUNDS };
