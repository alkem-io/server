import { Test, TestingModule } from '@nestjs/testing';
import { MockSearchExtractService } from '@test/mocks/search/search.extract.service.mock';
import { MockSearchResultsService } from '@test/mocks/search/search.result.service.mock';
import { MockEntityManagerProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SearchService } from './search.service';

describe('Search2Service', () => {
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        MockEntityManagerProvider,
        MockSearchExtractService,
        MockSearchResultsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
