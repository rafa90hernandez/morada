import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { ConversationsService } from '../src/conversations/conversations.service';
import { UserBlockingService } from '../src/conversations/user-blocking.service';
import { DatabaseService } from '../src/database/database.service';
import {
  IdentityDocumentType,
  IdentityVerificationStatus,
  ListingAuthorizationStatus,
  ListingCloseReason,
  ListingStatus,
  ListingType,
  PropertyType,
  UserRole,
  UserStatus,
} from '../src/generated/prisma/enums';
import { PublicListingSearchQueryDto } from '../src/listings/dto/public-listing-search-query.dto';
import { ListingLifecycleService } from '../src/listings/listing-lifecycle.service';
import { ListingModerationService } from '../src/listings/listing-moderation.service';
import { ListingsService } from '../src/listings/listings.service';
import { PublicListingSearchService } from '../src/listings/public-listing-search.service';
import { VisitsService } from '../src/visits/visits.service';

const NOW = new Date('2026-08-12T10:00:00.000Z');
const VISIT_START = new Date('2026-08-13T10:00:00.000Z');
const VISIT_END = new Date('2026-08-13T11:00:00.000Z');

function searchQuery(): PublicListingSearchQueryDto {
  return new PublicListingSearchQueryDto();
}

describe('Beta 1 critical journey (PostgreSQL integration)', () => {
  const database = new DatabaseService();
  const moderation = new ListingModerationService(database);
  const discovery = new PublicListingSearchService(database);
  const conversations = new ConversationsService(database);
  const blocking = new UserBlockingService(database);
  const visits = new VisitsService(database);
  const listings = new ListingsService(database);
  const lifecycle = new ListingLifecycleService(database, listings);

  let advertiserId: string;
  let seekerId: string;
  let outsiderId: string;
  let adminId: string;
  let listingId: string;

  beforeAll(async () => {
    await database.$connect();

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const [admin, advertiser, seeker, outsider] = await Promise.all([
      database.user.create({
        data: {
          email: `e2e-admin-${suffix}@morada.invalid`,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          profile: { create: { displayName: 'E2E Admin' } },
        },
        select: { id: true },
      }),
      database.user.create({
        data: {
          email: `e2e-advertiser-${suffix}@morada.invalid`,
          status: UserStatus.ACTIVE,
          profile: {
            create: {
              displayName: 'E2E Advertiser',
              dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
            },
          },
        },
        select: { id: true },
      }),
      database.user.create({
        data: {
          email: `e2e-seeker-${suffix}@morada.invalid`,
          status: UserStatus.ACTIVE,
          profile: {
            create: {
              displayName: 'E2E Seeker',
              dateOfBirth: new Date('1992-01-01T00:00:00.000Z'),
            },
          },
        },
        select: { id: true },
      }),
      database.user.create({
        data: {
          email: `e2e-outsider-${suffix}@morada.invalid`,
          status: UserStatus.ACTIVE,
          profile: { create: { displayName: 'E2E Outsider' } },
        },
        select: { id: true },
      }),
    ]);

    adminId = admin.id;
    advertiserId = advertiser.id;
    seekerId = seeker.id;
    outsiderId = outsider.id;

    const verification = await database.verification.create({
      data: { userId: advertiserId },
      select: { id: true },
    });

    await database.identityVerificationSubmission.create({
      data: {
        verificationId: verification.id,
        documentType: IdentityDocumentType.PASSPORT,
        status: IdentityVerificationStatus.APPROVED,
        reviewedAt: NOW,
        reviewedBy: adminId,
      },
    });

    const listing = await database.listing.create({
      data: {
        userId: advertiserId,
        type: ListingType.RENTAL,
        status: ListingStatus.PENDING_REVIEW,
        title: 'E2E room in Dublin',
        description: 'Synthetic listing used only by the disposable Beta 1 journey test.',
        city: 'Dublin',
        area: 'Dublin 8',
        county: 'Dublin',
        propertyType: PropertyType.APARTMENT,
        monthlyPriceCents: 120000,
        landlordApprovalRequired: false,
        privateLocation: {
          create: {
            addressLine1: '1 Integration Test Street',
            eircode: 'D00 TEST',
            exactLatitude: 53.34,
            exactLongitude: -6.28,
          },
        },
        publicLocation: {
          create: {
            latitude: 53.34,
            longitude: -6.28,
            radiusMeters: 500,
            approximationVersion: 'e2e-v1',
          },
        },
        photos: {
          create: {
            objectKey: `e2e/${suffix}/photo.jpg`,
            url: `/uploads/e2e/${suffix}/photo.jpg`,
            position: 0,
            width: 1200,
            height: 900,
            sizeBytes: 1000,
            mimeType: 'image/jpeg',
          },
        },
      },
      select: { id: true },
    });

    listingId = listing.id;

    await database.listingAuthorizationSubmission.create({
      data: {
        listingId,
        status: ListingAuthorizationStatus.APPROVED,
        reviewedAt: NOW,
        reviewedBy: adminId,
        relationshipVerified: true,
        landlordAuthorizationVerified: false,
      },
    });
  });

  afterAll(async () => {
    await database.$disconnect();
  });

  it('publishes, discovers, contacts, blocks, visits and closes without crossing privacy boundaries', async () => {
    const reviewed = await database.listing.findUniqueOrThrow({
      where: { id: listingId },
      select: { updatedAt: true },
    });

    const published = await moderation.approve(
      adminId,
      listingId,
      reviewed.updatedAt.toISOString(),
    );
    expect(published.status).toBe(ListingStatus.ACTIVE);

    const visible = await discovery.search(searchQuery(), NOW);
    expect(visible.items.map((item) => item.id)).toContain(listingId);

    const lifecycleRow = await database.listingLifecycle.findUniqueOrThrow({
      where: { listingId },
      select: { expiresAt: true },
    });
    expect(lifecycleRow.expiresAt?.getTime()).toBeGreaterThan(NOW.getTime());

    await database.listingLifecycle.update({
      where: { listingId },
      data: { expiresAt: new Date(NOW.getTime() - 1) },
    });
    const expired = await discovery.search(searchQuery(), NOW);
    expect(expired.items.map((item) => item.id)).not.toContain(listingId);

    await database.listingLifecycle.update({
      where: { listingId },
      data: { expiresAt: new Date(NOW.getTime() + 45 * 24 * 60 * 60 * 1000) },
    });

    const conversation = await conversations.startOrGet(seekerId, listingId, NOW);
    expect(conversation.listing.id).toBe(listingId);

    const firstMessage = await conversations.sendText(
      seekerId,
      conversation.id,
      'Hello from the synthetic seeker.',
      NOW,
    );
    expect(firstMessage.body).toBe('Hello from the synthetic seeker.');

    const proposed = await visits.propose(
      seekerId,
      conversation.id,
      {
        startsAt: VISIT_START.toISOString(),
        endsAt: VISIT_END.toISOString(),
      },
      NOW,
    );
    const accepted = await visits.accept(advertiserId, proposed.id, NOW);
    expect(accepted.visit.status).toBe('ACCEPTED');
    expect(accepted.overlapWarning).toBe(false);

    await expect(
      visits.getExactLocation(outsiderId, proposed.id, NOW),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(visits.getExactLocation(seekerId, proposed.id, NOW)).resolves.toMatchObject({
      addressLine1: '1 Integration Test Street',
      eircode: 'D00 TEST',
    });

    await blocking.block(seekerId, advertiserId);

    await expect(
      conversations.sendText(advertiserId, conversation.id, 'This must be blocked.', NOW),
    ).rejects.toBeInstanceOf(ForbiddenException);

    const blockedConversation = await conversations.get(seekerId, conversation.id);
    expect(blockedConversation.status).toBe('BLOCKED');

    await expect(
      visits.getExactLocation(seekerId, proposed.id, NOW),
    ).rejects.toBeInstanceOf(NotFoundException);

    await blocking.unblock(seekerId, advertiserId);
    await expect(visits.getExactLocation(seekerId, proposed.id, NOW)).resolves.toMatchObject({
      addressLine1: '1 Integration Test Street',
    });

    await lifecycle.close(advertiserId, listingId, {
      reason: ListingCloseReason.RENTED_VIA_MORADA,
      detail: 'Synthetic E2E close outcome',
    });

    const closed = await discovery.search(searchQuery(), NOW);
    expect(closed.items.map((item) => item.id)).not.toContain(listingId);

    const persisted = await database.listing.findUniqueOrThrow({
      where: { id: listingId },
      select: { status: true },
    });
    expect(persisted.status).toBe(ListingStatus.CLOSED);
  });
});
