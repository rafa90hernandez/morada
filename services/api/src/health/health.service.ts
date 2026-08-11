import { Inject, Injectable } from '@nestjs/common';

import type { PrivateStorageService } from '../common/storage/private-storage.interface';
import type { StorageService } from '../common/storage/storage.interface';
import {
  PRIVATE_STORAGE_SERVICE,
  STORAGE_SERVICE,
} from '../common/storage/storage.tokens';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Inject(PRIVATE_STORAGE_SERVICE)
    private readonly privateStorage: PrivateStorageService,
  ) {}

  live() {
    return { status: 'ok' as const };
  }

  async ready() {
    try {
      await this.database.$queryRaw`SELECT 1`;

      if (!this.storage || !this.privateStorage) {
        return { status: 'unavailable' as const };
      }

      return { status: 'ready' as const };
    } catch {
      return { status: 'unavailable' as const };
    }
  }
}
