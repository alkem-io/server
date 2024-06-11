import { Module } from '@nestjs/common';
import { SearchIngestService } from './search.ingest.service';
import { ElasticsearchClientProvider } from '@services/external/elasticsearch/elasticsearch-client';
import { TaskModule } from '@services/task';

@Module({
  imports: [TaskModule],
  providers: [SearchIngestService, ElasticsearchClientProvider],
  exports: [SearchIngestService],
})
export class SearchIngestModule {}
