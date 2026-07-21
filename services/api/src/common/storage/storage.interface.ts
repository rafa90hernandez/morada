import type {
  DeleteObjectInput,
  StoredObject,
  UploadObjectInput,
} from './storage.types';

export interface StorageService {
  upload(input: UploadObjectInput): Promise<StoredObject>;

  delete(input: DeleteObjectInput): Promise<void>;
}
