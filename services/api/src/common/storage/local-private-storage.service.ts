import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { constants } from 'node:fs';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type {
  PrivateStorageService,
  PrivateStoredObject,
  PrivateUploadObjectInput,
} from './private-storage.interface';

const LOCAL_PRIVATE_STORAGE_ENVIRONMENTS = new Set(['development', 'test']);

@Injectable()
export class LocalPrivateStorageService implements PrivateStorageService {
  private readonly storageRoot = resolve(process.cwd(), 'storage', 'private');

  constructor(private readonly configService: ConfigService) {
    const nodeEnv = this.configService.get<string>('NODE_ENV') ?? 'development';

    if (!LOCAL_PRIVATE_STORAGE_ENVIRONMENTS.has(nodeEnv)) {
      throw new Error(
        'Local private storage is disabled outside development/test. Configure an approved private storage provider before starting staging or production.',
      );
    }
  }

  async upload(input: PrivateUploadObjectInput): Promise<PrivateStoredObject> {
    const normalizedKey = this.normalizeKey(input.key);
    const destinationPath = this.resolveSafePath(normalizedKey);

    await mkdir(dirname(destinationPath), {
      recursive: true,
    });

    await writeFile(destinationPath, input.body);

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
  }

  async healthCheck(): Promise<void> {
    await mkdir(this.storageRoot, { recursive: true });
    await access(this.storageRoot, constants.R_OK | constants.W_OK);
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
