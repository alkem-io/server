import { Test, TestingModule } from '@nestjs/testing';
import { WingbackService } from './wingback.service';

describe('WingbackService', () => {
  let service: WingbackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WingbackService],
    }).compile();

    service = module.get<WingbackService>(WingbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
