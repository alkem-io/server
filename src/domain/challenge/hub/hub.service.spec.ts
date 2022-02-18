import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { HubService } from './hub.service';

describe('HubService', () => {
  let service: HubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<HubService>(HubService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
