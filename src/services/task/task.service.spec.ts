import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { MockCacheManager, MockWinstonProvider } from '@test/mocks';

describe('TaskService', () => {
  let service: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskService, MockCacheManager, MockWinstonProvider],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
