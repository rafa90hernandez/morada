export type ExactListingCoordinates = {
  latitude: number;
  longitude: number;
};

export type ApproximatePublicListingLocation = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  approximationVersion: 'GRID_V1';
};

const GRID_SIZE_DEGREES = 0.02;
const PUBLIC_RADIUS_METERS = 1500;

function centerOfGridCell(value: number): number {
  const lowerBound = Math.floor(value / GRID_SIZE_DEGREES) * GRID_SIZE_DEGREES;

  return Number((lowerBound + GRID_SIZE_DEGREES / 2).toFixed(6));
}

export function deriveApproximatePublicLocation(
  exact: ExactListingCoordinates,
): ApproximatePublicListingLocation {
  if (
    !Number.isFinite(exact.latitude) ||
    exact.latitude < -90 ||
    exact.latitude > 90
  ) {
    throw new RangeError('Latitude must be between -90 and 90 degrees.');
  }

  if (
    !Number.isFinite(exact.longitude) ||
    exact.longitude < -180 ||
    exact.longitude > 180
  ) {
    throw new RangeError('Longitude must be between -180 and 180 degrees.');
  }

  return {
    latitude: centerOfGridCell(exact.latitude),
    longitude: centerOfGridCell(exact.longitude),
    radiusMeters: PUBLIC_RADIUS_METERS,
    approximationVersion: 'GRID_V1',
  };
}
