import { Test, TestingModule } from '@nestjs/testing';
import { DataManagementService } from './data-management.service';

describe('DataManagementService', () => {
  let service: DataManagementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataManagementService],
    }).compile();

    service = module.get<DataManagementService>(DataManagementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
