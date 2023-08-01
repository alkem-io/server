import { Test, TestingModule } from '@nestjs/testing';
import { NameReporterService } from './name.reporter.service';

describe('NameReporterService', () => {
  let service: NameReporterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NameReporterService],
    }).compile();

    service = module.get<NameReporterService>(NameReporterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
