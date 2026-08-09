import { ListingStatus, ListingType, TransportMode } from '../../generated/prisma/enums';
import { ListingMapper } from './listing.mapper';

describe('ListingMapper', () => {
  it('exposes structured transport without leaking legacy gender preference', () => {
    const listing = {
      id: 'listing-id',
      type: ListingType.RENTAL,
      status: ListingStatus.ACTIVE,
      title: 'Private room',
      description: 'Bright room',
      city: 'Dublin',
      area: 'Dublin 8',
      genderPreference: 'FEMALE_ONLY',
      kitchenAmenities: [],
      outdoorAmenities: [],
      trustScore: 0,
      photos: [],
      exchangePreference: null,
      transportOptions: [
        {
          id: 'transport-id',
          mode: TransportMode.LUAS,
          stopName: 'Fatima',
          lineName: 'Red Line',
          walkingMinutes: 8,
          distanceMeters: 600,
        },
      ],
      user: {
        id: 'user-id',
        status: 'ACTIVE',
        createdAt: new Date('2026-08-09T00:00:00.000Z'),
        profile: null,
        trustScore: null,
      },
      createdAt: new Date('2026-08-09T00:00:00.000Z'),
      updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    };

    const response = ListingMapper.toResponse(listing as never);

    expect(response.transport.options).toEqual([
      {
        id: 'transport-id',
        mode: TransportMode.LUAS,
        stopName: 'Fatima',
        lineName: 'Red Line',
        walkingMinutes: 8,
        distanceMeters: 600,
      },
    ]);
    expect(JSON.stringify(response)).not.toContain('genderPreference');
    expect(JSON.stringify(response)).not.toContain('FEMALE_ONLY');
  });
});
