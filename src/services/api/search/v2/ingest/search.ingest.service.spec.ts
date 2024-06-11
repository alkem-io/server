import { Test, TestingModule } from '@nestjs/testing';
import {
  MockConfigService,
  MockElasticsearchClientProvider,
  MockEntityManagerProvider,
  MockWinstonProvider,
} from '@test/mocks';
import { SearchIngestService } from './search.ingest.service';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';

describe('SearchIngestService', () => {
  let service: SearchIngestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchIngestService,
        MockElasticsearchClientProvider,
        MockWinstonProvider,
        MockEntityManagerProvider,
        MockConfigService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<SearchIngestService>(SearchIngestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
