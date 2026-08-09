import { deriveApproximatePublicLocation } from './listing-location-privacy';

describe('deriveApproximatePublicLocation', () => {
  it('returns a server-derived grid centre instead of the exact coordinates', () => {
    const result = deriveApproximatePublicLocation({
      latitude: 53.343928,
      longitude: -6.300412,
    });

    expect(result).toEqual({
      latitude: 53.35,
      longitude: -6.31,
      radiusMeters: 1500,
      approximationVersion: 'GRID_V1',
    });
    expect(result.latitude).not.toBe(53.343928);
    expect(result.longitude).not.toBe(-6.300412);
  });

  it.each([
    [{ latitude: 91, longitude: 0 }, 'Latitude'],
    [{ latitude: -91, longitude: 0 }, 'Latitude'],
    [{ latitude: 0, longitude: 181 }, 'Longitude'],
    [{ latitude: 0, longitude: -181 }, 'Longitude'],
    [{ latitude: Number.NaN, longitude: 0 }, 'Latitude'],
  ] as const)('rejects invalid coordinates %p', (coordinates, field) => {
    expect(() => deriveApproximatePublicLocation(coordinates)).toThrow(field);
  });
});
