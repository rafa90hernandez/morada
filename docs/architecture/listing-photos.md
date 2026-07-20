# Listing Photos Architecture

## Status

Approved for implementation.

## Context

Listings in Morada require multiple photos for public presentation, trust,
moderation and search results.

Images must not be stored directly in PostgreSQL. The database stores only
metadata and the object-storage reference.

## Goals

- Allow listing owners to upload photos.
- Validate and process images securely.
- Remove metadata such as EXIF.
- Convert images to an optimized format.
- Allow photo deletion.
- Allow photo reordering.
- Define the first photo as the listing cover.
- Prevent access to deleted listings.
- Prepare the storage layer for Cloudflare R2.

## Non-goals

The following are not part of this sprint:

- Video uploads.
- User profile photos.
- AI image analysis.
- Automatic content moderation.
- Frontend drag-and-drop implementation.
- Image editing or cropping tools.

## Supported formats

Accepted input formats:

- JPEG
- PNG
- WebP

Rejected formats include:

- SVG
- GIF
- PDF
- TIFF
- HEIC
- executables
- archives
- any unsupported MIME type

## Limits

- Maximum photos per listing: 20
- Maximum input size per image: 10 MB
- Maximum upload request: 10 MB
- Maximum processed width: 1920 px
- Maximum processed height: 1920 px
- Output format: WebP
- Output quality: 82

The image must preserve its aspect ratio and must not be enlarged beyond its
original dimensions.

## Storage

Production storage:

- Cloudflare R2
- S3-compatible API

Database storage:

- Object key
- Public URL or delivery URL
- Width
- Height
- File size
- Display position
- Creation timestamp

Binary image content must never be stored in PostgreSQL.

## Object key format

Objects use generated identifiers and never use the original filename.

Example:

listings/{listingId}/{photoId}.webp

The original filename must not be used as part of the storage key.

## Data model

ListingPhoto:

- id
- listingId
- objectKey
- url
- position
- width
- height
- sizeBytes
- mimeType
- createdAt
- updatedAt

The cover photo is derived from the lowest position.

An `isCover` database field is intentionally avoided because it creates
duplicated state and may become inconsistent with the photo order.

## Ordering

Photo positions are zero-based:

- 0 = cover photo
- 1 = second photo
- 2 = third photo

Positions must be unique per listing.

When a photo is removed, remaining positions must be normalized.

Example:

Before:

- photo-a: 0
- photo-b: 1
- photo-c: 2

After deleting photo-b:

- photo-a: 0
- photo-c: 1

## Authorization

Only the listing owner may:

- upload photos
- delete photos
- reorder photos

Public users may only see photos through public listing responses.

Photos associated with deleted listings must not be manageable through normal
listing endpoints.

## Listing status rules

Photo operations are allowed for listings with these statuses:

- DRAFT
- PENDING_REVIEW
- ACTIVE
- PAUSED
- REJECTED

Photo operations are not allowed for:

- CLOSED
- soft-deleted listings

When photos are changed on a listing with status ACTIVE, PAUSED or REJECTED,
the listing must return to PENDING_REVIEW because its public content changed.

When a PENDING_REVIEW or DRAFT listing is changed, its status remains unchanged.

## Upload flow

1. Authenticate the user.
2. Find the listing owned by the authenticated user.
3. Reject closed or deleted listings.
4. Check the current photo count.
5. Reject the upload if the listing already has 20 photos.
6. Validate request size.
7. Validate MIME type.
8. Inspect the actual file signature.
9. Decode the image.
10. Apply orientation.
11. Remove metadata.
12. Resize within 1920 × 1920.
13. Convert to WebP.
14. Generate the photo ID and object key.
15. Upload the processed image to object storage.
16. Create the database record.
17. Update listing moderation status when required.
18. Return the owner photo response.

If storage upload succeeds but the database operation fails, the uploaded
object must be removed as compensation.

## Deletion flow

1. Authenticate the user.
2. Validate listing ownership.
3. Find the photo.
4. Delete the database record in a transaction.
5. Normalize remaining positions.
6. Update listing moderation status when required.
7. Remove the object from storage.

Storage deletion should be idempotent. A missing object must not prevent the
database operation from completing.

## Reordering flow

The client sends the complete ordered list of photo IDs.

Example:

{
  "photoIds": [
    "photo-c",
    "photo-a",
    "photo-b"
  ]
}

Validation rules:

- The array cannot be empty when the listing has photos.
- IDs cannot be duplicated.
- Every existing listing photo must be present.
- No photo from another listing may be included.
- The number of IDs must equal the number of existing photos.

All position updates must happen inside a transaction.

## API endpoints

### Upload one photo

POST /listings/:listingId/photos

Content-Type:

multipart/form-data

Field:

file

Authentication:

Bearer access token

### Delete one photo

DELETE /listings/:listingId/photos/:photoId

Authentication:

Bearer access token

### Reorder photos

PATCH /listings/:listingId/photos/order

Authentication:

Bearer access token

Body:

{
  "photoIds": ["photo-id-1", "photo-id-2"]
}

### Photo listing

A separate public photo-list endpoint is not required for the MVP.

Photos are returned as part of:

- public listing responses
- owner listing responses

This prevents duplicated API contracts.

## Response model

{
  "id": "photo-id",
  "url": "https://images.example.com/listings/...",
  "position": 0,
  "width": 1600,
  "height": 1067,
  "sizeBytes": 182340,
  "mimeType": "image/webp",
  "isCover": true,
  "createdAt": "2026-07-20T00:00:00.000Z"
}

`isCover` is calculated by the response mapper from `position === 0`.

## Storage abstraction

Application code must depend on a storage interface, not directly on the R2
SDK.

Required operations:

- upload
- delete

The implementation must support:

- R2 storage in production
- local or in-memory storage during tests

## Security requirements

- Validate authentication and ownership.
- Reject unsupported MIME types.
- Validate the actual decoded image.
- Never trust the original filename.
- Generate object keys internally.
- Remove EXIF and other metadata.
- Prevent SVG uploads.
- Prevent path traversal.
- Limit request size.
- Limit the number of photos.
- Use randomized IDs.
- Do not expose internal bucket credentials.
- Do not expose object-storage administrative URLs.
- Keep storage credentials in environment variables.
- Avoid logging binary file contents.

## Performance requirements

- Process one image per request in the MVP.
- Resize before upload.
- Store optimized WebP files.
- Avoid loading multiple large images in one request.
- Return ordered photos using a database index.
- Use direct CDN or public delivery URLs for image retrieval.

Multiple-file upload may be introduced later after measuring memory and request
processing behavior.

## Database constraints

- Cascade delete ListingPhoto records when the parent listing is permanently
  deleted.
- Unique constraint on listingId and position.
- Index on listingId and position.

## Error cases

Expected domain errors include:

- Listing not found.
- Photo not found.
- Listing is closed.
- Maximum number of photos reached.
- Unsupported image type.
- Image exceeds the maximum size.
- Invalid image file.
- Invalid photo order.
- Storage operation failed.

## Observability

Log:

- requestId
- listingId
- photoId
- storage operation
- processed size
- processing duration

Never log:

- image binary content
- storage secrets
- signed credentials

## Testing strategy

Unit tests:

- ownership validation
- status transitions
- maximum photo limit
- MIME rejection
- reorder validation
- position normalization
- mapper cover calculation

Integration tests:

- successful upload
- rejected invalid image
- delete photo
- reorder photos
- inaccessible deleted listing
- unauthorized user
- storage compensation on database failure

## Architectural decisions

1. Images are converted to WebP.
2. Upload is limited to one image per request in the MVP.
3. The cover is derived from position zero.
4. Storage access is abstracted behind an interface.
5. Photos are embedded in listing responses.
6. Public listing visibility remains restricted to ACTIVE listings.
7. Editing photos on public or rejected listings returns the listing to
   PENDING_REVIEW.