import { Module } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { ElasticsearchClientProvider } from './elasticsearch-client';

@Module({
  providers: [ElasticsearchService, ElasticsearchClientProvider],
  exports: [ElasticsearchService],
})
export class ElasticsearchModule {}
