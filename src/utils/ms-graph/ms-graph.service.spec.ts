import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { MsGraphService } from './ms-graph.service';

describe('MsGraphService', () => {
  let service: MsGraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<MsGraphService>(MsGraphService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
