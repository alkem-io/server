import { Test, TestingModule } from '@nestjs/testing';
import { MsGraphService } from './ms-graph.service';

describe('MsGraphService', () => {
  let service: MsGraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MsGraphService],
    }).compile();

    service = module.get<MsGraphService>(MsGraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
