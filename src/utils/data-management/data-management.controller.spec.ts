import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@src/app.module';
import { DataManagementController } from './data-management.controller';

describe('DataManagementController', () => {
  let controller: DataManagementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get<DataManagementController>(DataManagementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
