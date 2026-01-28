import { Module } from '@nestjs/common';
import { ElasticsearchClientProvider } from '@services/external/elasticsearch/elasticsearch-client';
import { TaskModule } from '@services/task';
import { SearchIngestService } from './search.ingest.service';

@Module({
  imports: [TaskModule],
  providers: [SearchIngestService, ElasticsearchClientProvider],
  exports: [SearchIngestService],
})
export class SearchIngestModule {}
