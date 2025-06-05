import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HocuspocusService } from './hocuspocus.service';
import { CollaborativeDocument } from './collaborative-document.entity';
import { CollaborativeDocumentService } from './collaborative-document.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([CollaborativeDocument])],
  providers: [HocuspocusService, CollaborativeDocumentService],
  exports: [HocuspocusService, CollaborativeDocumentService],
})
export class HocuspocusModule {}
