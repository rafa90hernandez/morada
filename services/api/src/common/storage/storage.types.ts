export interface UploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface DeleteObjectInput {
  key: string;
}

export interface StoredObject {
  key: string;
  url: string;
}
