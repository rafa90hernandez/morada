export interface CreateListingPhotoInput {
  id: string;
  listingId: string;
  objectKey: string;
  url: string;
  position: number;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export interface UploadListingPhotoCommand {
  listingId: string;
  authenticatedUserId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
}

export interface ProcessedListingImage {
  buffer: Buffer;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: 'image/webp';
}

export interface StoredListingPhotoObject {
  objectKey: string;
  url: string;
}
