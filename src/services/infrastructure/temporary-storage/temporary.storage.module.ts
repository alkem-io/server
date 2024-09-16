import { Module } from '@nestjs/common';
import { TemporaryStorageService } from './temporary.storage.service';
import { DocumentModule } from '@domain/storage/document/document.module';

@Module({
  imports: [DocumentModule],
  providers: [TemporaryStorageService],
  exports: [TemporaryStorageService],
})
export class TemporaryStorageModule {}
