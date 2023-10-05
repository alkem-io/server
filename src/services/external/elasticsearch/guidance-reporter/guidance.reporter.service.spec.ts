import { Test, TestingModule } from '@nestjs/testing';
import { GuidanceReporterService } from './guidance.reporter.service';
import {
  MockConfigService,
  MockElasticsearchClientProvider,
  MockWinstonProvider,
} from '@test/mocks';

describe('ContributionReporterService', () => {
  let service: GuidanceReporterService;

  MockConfigService.useValue = {
    ...MockConfigService.useValue,
    get: () => ({
      elasticsearch: {},
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuidanceReporterService,
        MockWinstonProvider,
        MockConfigService,
        MockElasticsearchClientProvider,
      ],
    }).compile();

    service = module.get<GuidanceReporterService>(GuidanceReporterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
