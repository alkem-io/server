import { ClassProvider } from '@nestjs/common';
import { STORAGE_SERVICE } from '@common/constants';
import { StorageService } from './storage.service.interface';
import { LocalStorageAdapter } from './local-storage/local.storage.adapter';

export const StorageServiceProvider: ClassProvider<StorageService> = {
  provide: STORAGE_SERVICE,
  useClass: LocalStorageAdapter,
};
