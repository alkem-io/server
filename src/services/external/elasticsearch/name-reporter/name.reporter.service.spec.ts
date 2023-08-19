import { Test, TestingModule } from '@nestjs/testing';
import { NameReporterService } from './name.reporter.service';
import {
  MockConfigService,
  MockElasticsearchClientProvider,
  MockWinstonProvider,
} from '@test/mocks';

describe('NameReporterService', () => {
  let service: NameReporterService;

  MockConfigService.useValue = {
    ...MockConfigService.useValue,
    get: () => ({
      elasticsearch: {},
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NameReporterService,
        MockWinstonProvider,
        MockConfigService,
        MockElasticsearchClientProvider,
      ],
    }).compile();

    service = module.get<NameReporterService>(NameReporterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
