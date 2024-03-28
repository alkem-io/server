import { Test, TestingModule } from '@nestjs/testing';
import {
  MockElasticsearchClientProvider,
  MockWinstonProvider,
} from '@test/mocks';
import { SearchIngestService } from './search.ingest.service';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('SearchIngestService', () => {
  let service: SearchIngestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIngestService,
        MockElasticsearchClientProvider,
        MockWinstonProvider,
        TypeOrmModule,
      ],
    }).compile();

    service = module.get<SearchIngestService>(SearchIngestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
