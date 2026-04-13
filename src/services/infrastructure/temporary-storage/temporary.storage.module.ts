import { DocumentModule } from '@domain/storage/document/document.module';
import { Module } from '@nestjs/common';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { TemporaryStorageService } from './temporary.storage.service';

@Module({
  imports: [DocumentModule, FileServiceAdapterModule],
  providers: [TemporaryStorageService],
  exports: [TemporaryStorageService],
})
export class TemporaryStorageModule {}
