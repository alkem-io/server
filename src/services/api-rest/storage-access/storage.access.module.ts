import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { StorageAccessController } from './storage.access.controller';
import { DocumentModule } from '@domain/storage/document/document.module';

@Module({
  imports: [AuthorizationModule, DocumentModule],
  controllers: [StorageAccessController],
  exports: [],
})
export class StorageAccessModule {}
