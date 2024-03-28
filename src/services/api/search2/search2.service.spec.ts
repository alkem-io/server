import { Test, TestingModule } from '@nestjs/testing';
import { Search2Service } from './search2.service';
import { MockSearchExtractService } from '@test/mocks/search/search.extract.service.mock';
import { MockSearchResultsService } from '@test/mocks/search/search.result.service.mock';

describe('Search2Service', () => {
  let service: Search2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Search2Service,
        MockSearchExtractService,
        MockSearchResultsService,
      ],
    }).compile();

    service = module.get<Search2Service>(Search2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
