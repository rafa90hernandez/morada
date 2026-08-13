import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { ListingType, PropertyType } from '../../generated/prisma/enums';
import {
  PublicListingSearchQueryDto,
  PublicListingSort,
} from './public-listing-search-query.dto';

describe('PublicListingSearchQueryDto', () => {
  it('coerces bounded pagination, booleans and household filters safely', async () => {
    const dto = plainToInstance(PublicListingSearchQueryDto, {
      page: '2',
      limit: '25',
      furnished: 'false',
      couplesAllowed: 'true',
      maxPriceCents: '120000',
      currentResidentCount: '3',
      peopleSharingSpace: '1',
      peopleSharingBathroom: '2',
      propertyType: PropertyType.SINGLE_ROOM,
      listingType: ListingType.RENTAL,
      sort: PublicListingSort.PRICE_ASC,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto).toMatchObject({
      page: 2,
      limit: 25,
      furnished: false,
      couplesAllowed: true,
      maxPriceCents: 120000,
      currentResidentCount: 3,
      peopleSharingSpace: 1,
      peopleSharingBathroom: 2,
      sort: PublicListingSort.PRICE_ASC,
    });
  });

  it('rejects unsupported Beta 1 listing types, oversized pages and negative household counts', async () => {
    const dto = plainToInstance(PublicListingSearchQueryDto, {
      listingType: ListingType.EXCHANGE,
      limit: '500',
      currentResidentCount: '-1',
      peopleSharingSpace: '-1',
      peopleSharingBathroom: '-1',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'listingType',
        'limit',
        'currentResidentCount',
        'peopleSharingSpace',
        'peopleSharingBathroom',
      ]),
    );
  });
});
