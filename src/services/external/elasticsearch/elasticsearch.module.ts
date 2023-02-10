import { Module } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';

@Module({
  providers: [ElasticsearchService],
  exports: [ElasticsearchService],
})
export class ElasticsearchModule {}
