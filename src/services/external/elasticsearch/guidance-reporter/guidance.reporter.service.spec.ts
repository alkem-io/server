import { Test, TestingModule } from '@nestjs/testing';
import {
  MockConfigService,
  MockElasticsearchClientProvider,
  MockUserService,
  MockWinstonProvider,
} from '@test/mocks';
import { GuidanceReporterService } from './guidance.reporter.service';

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
        MockUserService,
        MockElasticsearchClientProvider,
      ],
    }).compile();

    service = module.get<GuidanceReporterService>(GuidanceReporterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
