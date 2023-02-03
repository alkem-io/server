import { Test, TestingModule } from '@nestjs/testing';
import { ElasticsearchService } from './elasticsearch.service';
import { MockConfigService, MockWinstonProvider } from '@test/mocks';

describe('ElasticsearchService', () => {
  let service: ElasticsearchService;

  MockConfigService.useValue = {
    ...MockConfigService.useValue,
    get: () => ({
      elasticsearch: {},
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ElasticsearchService, MockWinstonProvider, MockConfigService],
    }).compile();

    service = module.get<ElasticsearchService>(ElasticsearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
