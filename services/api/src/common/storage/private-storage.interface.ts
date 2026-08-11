export interface PrivateUploadObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

export interface PrivateStoredObject {
  key: string;
}

export interface PrivateStorageService {
  upload(input: PrivateUploadObjectInput): Promise<PrivateStoredObject>;

  read(key: string): Promise<Buffer>;

  delete(key: string): Promise<void>;

  healthCheck(): Promise<void>;
}
