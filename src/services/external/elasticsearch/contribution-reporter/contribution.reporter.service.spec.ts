import { Test, TestingModule } from '@nestjs/testing';
import { ContributionReporterService } from './contribution.reporter.service';
import {
  MockConfigService,
  MockElasticsearchClientProvider,
  MockWinstonProvider,
} from '@test/mocks';

describe('ContributionReporterService', () => {
  let service: ContributionReporterService;

  MockConfigService.useValue = {
    ...MockConfigService.useValue,
    get: () => ({
      elasticsearch: {},
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionReporterService,
        MockWinstonProvider,
        MockConfigService,
        MockElasticsearchClientProvider,
      ],
    }).compile();

    service = module.get<ContributionReporterService>(
      ContributionReporterService
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
