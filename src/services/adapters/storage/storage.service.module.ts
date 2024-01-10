import { Module } from '@nestjs/common';
import { StorageServiceProvider } from './storage.service.provider';

@Module({
  providers: [StorageServiceProvider],
  exports: [StorageServiceProvider],
})
export class StorageServiceModule {}
