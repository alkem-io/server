import { Test, TestingModule } from '@nestjs/testing';
import { KonfigService } from './config.service';

describe('ConfigService', () => {
  let service: KonfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KonfigService],
    }).compile();

    service = module.get<KonfigService>(KonfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
