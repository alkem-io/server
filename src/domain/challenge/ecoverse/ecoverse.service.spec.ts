import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { EcoverseService } from './ecoverse.service';

describe('EcoverseService', () => {
  let service: EcoverseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<EcoverseService>(EcoverseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
