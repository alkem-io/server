import { Test, TestingModule } from '@nestjs/testing';
import { MockSearchExtractService } from '@test/mocks/search/search.extract.service.mock';
import { MockSearchResultsService } from '@test/mocks/search/search.result.service.mock';
import { MockEntityManagerProvider } from '@test/mocks';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Search2Service } from './search2.service';

describe('Search2Service', () => {
  let service: Search2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Search2Service,
        MockEntityManagerProvider,
        MockSearchExtractService,
        MockSearchResultsService,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<Search2Service>(Search2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
