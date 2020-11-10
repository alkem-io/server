import { Test, TestingModule } from '@nestjs/testing';
import { EcoverseService } from './ecoverse.service';

describe('EcoverseService', () => {
  let service: EcoverseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EcoverseService],
    }).compile();

    service = module.get<EcoverseService>(EcoverseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
