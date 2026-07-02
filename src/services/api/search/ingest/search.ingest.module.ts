import { Module } from '@nestjs/common';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { ElasticsearchClientProvider } from '@services/external/elasticsearch/elasticsearch-client';
import { TaskModule } from '@services/task';
import { CollaboraTextExtractService } from '../extract/collabora.text.extract.service';
import { SearchIngestService } from './search.ingest.service';

@Module({
  imports: [TaskModule, FileServiceAdapterModule],
  providers: [
    SearchIngestService,
    CollaboraTextExtractService,
    ElasticsearchClientProvider,
  ],
  exports: [SearchIngestService],
})
export class SearchIngestModule {}
