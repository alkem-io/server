import { Test, TestingModule } from '@nestjs/testing';
import { LicenseManagerService } from './license.manager.service';

describe('LicenseManagerService', () => {
  let service: LicenseManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LicenseManagerService],
    }).compile();

    service = module.get<LicenseManagerService>(LicenseManagerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
