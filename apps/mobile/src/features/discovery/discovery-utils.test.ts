import assert from 'node:assert/strict';
import test from 'node:test';

import type { ListingCard } from '@/api/types';
import { boundsFromCards, DEFAULT_DUBLIN_BOUNDS } from './discovery-utils';

function card(latitude: number, longitude: number): ListingCard {
  return {
    id: `${latitude}-${longitude}`,
    type: 'RENTAL',
    title: 'Test listing',
    location: {
      city: 'Dublin',
      area: null,
      county: 'Dublin',
      postalDistrict: null,
      approximate: {
        latitude,
        longitude,
        radiusMeters: 1500,
        approximationVersion: 'GRID_V1',
      },
    },
    accommodation: {
      propertyType: null,
      occupancyType: null,
      advertisedSpaceType: null,
      bathroomType: null,
      bedroomCount: null,
      bathroomCount: null,
      furnished: null,
    },
    pricing: {
      monthlyPriceCents: null,
      currency: 'EUR',
      billsIncludedType: null,
    },
    suitability: {
      couplesAllowed: null,
      petsAllowed: null,
      smokingAllowed: null,
    },
    availability: { availableFrom: null, minimumStayDays: null },
    coverPhoto: null,
    trustScore: 0,
    publishedAt: null,
    expiresAt: new Date().toISOString(),
  };
}

test('uses the Dublin fallback when search results have no approximate points', () => {
  assert.deepEqual(boundsFromCards([]), DEFAULT_DUBLIN_BOUNDS);
});

test('derives a padded viewport only from approximate public points', () => {
  assert.deepEqual(boundsFromCards([card(53.3, -6.4), card(53.4, -6.2)]), {
    north: 53.44,
    south: 53.26,
    east: -6.16,
    west: -6.44,
  });
});
