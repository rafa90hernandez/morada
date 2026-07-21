import { Injectable, Logger } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type { StorageService } from './storage.interface';
import type {
  DeleteObjectInput,
  StoredObject,
  UploadObjectInput,
} from './storage.types';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);

  private readonly storageRoot = resolve(process.cwd(), 'storage', 'uploads');

  async upload(input: UploadObjectInput): Promise<StoredObject> {
    const normalizedKey = this.normalizeKey(input.key);
    const destinationPath = this.resolveSafePath(normalizedKey);

    await mkdir(dirname(destinationPath), {
      recursive: true,
    });

    await writeFile(destinationPath, input.body);

    this.logger.debug(`Stored local object: ${normalizedKey}`);

    return {
      key: normalizedKey,
      url: `/uploads/${normalizedKey}`,
    };
  }

  async delete(input: DeleteObjectInput): Promise<void> {
    const normalizedKey = this.normalizeKey(input.key);
    const destinationPath = this.resolveSafePath(normalizedKey);

    await rm(destinationPath, {
      force: true,
    });

    this.logger.debug(`Deleted local object: ${normalizedKey}`);
  }

  private normalizeKey(key: string): string {
    return key.replaceAll('\\', '/').replace(/^\/+/, '');
  }

  private resolveSafePath(key: string): string {
    const destinationPath = resolve(this.storageRoot, key);

    const allowedPrefix = `${this.storageRoot}${sep}`;

    if (
      destinationPath !== this.storageRoot &&
      !destinationPath.startsWith(allowedPrefix)
    ) {
      throw new Error('Invalid storage object key');
    }

    return destinationPath;
  }
}
