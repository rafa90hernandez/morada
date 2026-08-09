import { Global, Module } from '@nestjs/common';

import { LocalPrivateStorageService } from './local-private-storage.service';
import { LocalStorageService } from './local-storage.service';
import { PRIVATE_STORAGE_SERVICE, STORAGE_SERVICE } from './storage.tokens';

@Global()
@Module({
  providers: [
    LocalStorageService,
    LocalPrivateStorageService,
    {
      provide: STORAGE_SERVICE,
      useExisting: LocalStorageService,
    },
    {
      provide: PRIVATE_STORAGE_SERVICE,
      useExisting: LocalPrivateStorageService,
    },
  ],
  exports: [STORAGE_SERVICE, PRIVATE_STORAGE_SERVICE],
})
export class StorageModule {}
