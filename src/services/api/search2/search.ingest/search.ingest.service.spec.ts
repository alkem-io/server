import { Test, TestingModule } from '@nestjs/testing';
import { SearchIngestService } from './search.ingest.service';

describe('SearchIngestService', () => {
  let service: SearchIngestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchIngestService],
    }).compile();

    service = module.get<SearchIngestService>(SearchIngestService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
