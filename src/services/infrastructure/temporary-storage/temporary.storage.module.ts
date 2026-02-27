import { DocumentModule } from '@domain/storage/document/document.module';
import { Module } from '@nestjs/common';
import { TemporaryStorageService } from './temporary.storage.service';

@Module({
  imports: [DocumentModule],
  providers: [TemporaryStorageService],
  exports: [TemporaryStorageService],
})
export class TemporaryStorageModule {}
