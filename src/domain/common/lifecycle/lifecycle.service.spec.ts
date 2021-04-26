import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { LifecycleService } from './lifecycle.service';

describe('LifecycleService', () => {
  let service: LifecycleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<LifecycleService>(LifecycleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
