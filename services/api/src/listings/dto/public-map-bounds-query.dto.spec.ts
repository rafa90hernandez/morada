import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { PublicMapBoundsQueryDto } from './public-map-bounds-query.dto';

describe('PublicMapBoundsQueryDto', () => {
  it('coerces valid viewport query strings and applies the default limit', async () => {
    const dto = plainToInstance(PublicMapBoundsQueryDto, {
      north: '53.5',
      south: '53.2',
      east: '-6.0',
      west: '-6.5',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toEqual(
      expect.objectContaining({
        north: 53.5,
        south: 53.2,
        east: -6,
        west: -6.5,
        limit: 200,
      }),
    );
  });

  it('rejects out-of-range coordinates and result limits', async () => {
    const dto = plainToInstance(PublicMapBoundsQueryDto, {
      north: '91',
      south: '-91',
      east: '181',
      west: '-181',
      limit: '501',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['north', 'south', 'east', 'west', 'limit']),
    );
  });
});
