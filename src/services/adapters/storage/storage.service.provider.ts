import { STORAGE_SERVICE } from '@common/constants';
import { ClassProvider } from '@nestjs/common';
import { LocalStorageAdapter } from './local-storage/local.storage.adapter';
import { StorageService } from './storage.service.interface';

export const StorageServiceProvider: ClassProvider<StorageService> = {
  provide: STORAGE_SERVICE,
  useClass: LocalStorageAdapter,
};
