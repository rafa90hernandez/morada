import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type {
  PrivateStorageService,
  PrivateStoredObject,
  PrivateUploadObjectInput,
} from './private-storage.interface';

@Injectable()
export class LocalPrivateStorageService implements PrivateStorageService {
  private readonly logger = new Logger(LocalPrivateStorageService.name);

  private readonly storageRoot = resolve(process.cwd(), 'storage', 'private');

  async upload(input: PrivateUploadObjectInput): Promise<PrivateStoredObject> {
    const normalizedKey = this.normalizeKey(input.key);
    const destinationPath = this.resolveSafePath(normalizedKey);

    await mkdir(dirname(destinationPath), {
      recursive: true,
    });

    await writeFile(destinationPath, input.body);

    this.logger.debug(`Stored private local object: ${normalizedKey}`);

    return {
      key: normalizedKey,
    };
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolveSafePath(this.normalizeKey(key)));
  }

  async delete(key: string): Promise<void> {
    const normalizedKey = this.normalizeKey(key);

    await rm(this.resolveSafePath(normalizedKey), {
      force: true,
    });

    this.logger.debug(`Deleted private local object: ${normalizedKey}`);
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
      throw new Error('Invalid private storage object key');
    }

    return destinationPath;
  }
}
