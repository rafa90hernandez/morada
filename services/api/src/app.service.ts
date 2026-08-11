import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { PrivateStorageService } from './common/storage/private-storage.interface';
import type { StorageService } from './common/storage/storage.interface';
import {
  PRIVATE_STORAGE_SERVICE,
  STORAGE_SERVICE,
} from './common/storage/storage.tokens';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(
    private readonly database: DatabaseService,
    @Inject(STORAGE_SERVICE)
    private readonly storage: StorageService,
    @Inject(PRIVATE_STORAGE_SERVICE)
    private readonly privateStorage: PrivateStorageService,
  ) {}

  getLiveness() {
    return {
      status: 'ok',
    } as const;
  }

  async getReadiness() {
    try {
      await Promise.all([
        this.database.$queryRaw`SELECT 1`,
        this.storage.healthCheck(),
        this.privateStorage.healthCheck(),
      ]);

      return {
        status: 'ready',
      } as const;
    } catch {
      throw new ServiceUnavailableException({
        status: 'not_ready',
      });
    }
  }
}
