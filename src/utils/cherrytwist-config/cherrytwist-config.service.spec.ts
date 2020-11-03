import { Test, TestingModule } from '@nestjs/testing';
import { CherrytwistConfigService } from './cherrytwist-config.service';

describe('CherrytwistConfigService', () => {
  let service: CherrytwistConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CherrytwistConfigService],
    }).compile();

    service = module.get<CherrytwistConfigService>(CherrytwistConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
