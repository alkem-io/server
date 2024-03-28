import { Test, TestingModule } from '@nestjs/testing';
import {
  MockElasticsearchClientProvider,
  MockEntityManagerProvider,
  MockWinstonProvider,
} from '@test/mocks';
import { SearchIngestService } from './search.ingest.service';

describe('SearchIngestService', () => {
  let service: SearchIngestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIngestService,
        MockElasticsearchClientProvider,
        MockWinstonProvider,
        MockEntityManagerProvider,
      ],
    }).compile();

    service = module.get<SearchIngestService>(SearchIngestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
