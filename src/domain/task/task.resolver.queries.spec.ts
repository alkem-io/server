import { TaskStatus } from '@domain/task/dto/task.status.enum';
import { Test, TestingModule } from '@nestjs/testing';
import { Task } from '@services/task/task.interface';
import { TaskService } from '@services/task/task.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { TaskResolverQueries } from './task.resolver.queries';

describe('TaskResolverQueries', () => {
  let resolver: TaskResolverQueries;
  let taskService: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskResolverQueries,
        MockWinstonProvider,
        {
          provide: TaskService,
          useValue: {
            get: vi.fn(),
            getAll: vi.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<TaskResolverQueries>(TaskResolverQueries);
    taskService = module.get<TaskService>(TaskService);
  });

  describe('task', () => {
    it('should delegate to TaskService.get with the provided ID', async () => {
      const mockTask: Task = {
        id: 'task-123',
        created: Date.now(),
        start: Date.now(),
        status: TaskStatus.IN_PROGRESS,
        results: [],
        errors: [],
      };
      vi.spyOn(taskService, 'get').mockResolvedValue(mockTask);

      const result = await resolver.task('task-123');

      expect(result).toBe(mockTask);
      expect(taskService.get).toHaveBeenCalledWith('task-123');
    });

    it('should return undefined when task is not found', async () => {
      vi.spyOn(taskService, 'get').mockResolvedValue(undefined);

      const result = await resolver.task('nonexistent');

      expect(result).toBeUndefined();
      expect(taskService.get).toHaveBeenCalledWith('nonexistent');
    });
  });

  describe('tasks', () => {
    it('should delegate to TaskService.getAll with status filter', async () => {
      const mockTasks: Task[] = [
        {
          id: 'task-1',
          created: Date.now(),
          start: Date.now(),
          status: TaskStatus.IN_PROGRESS,
          results: [],
          errors: [],
        },
      ];
      vi.spyOn(taskService, 'getAll').mockResolvedValue(mockTasks);

      const result = await resolver.tasks(TaskStatus.IN_PROGRESS);

      expect(result).toBe(mockTasks);
      expect(taskService.getAll).toHaveBeenCalledWith(TaskStatus.IN_PROGRESS);
    });

    it('should delegate to TaskService.getAll without status filter', async () => {
      const mockTasks: Task[] = [];
      vi.spyOn(taskService, 'getAll').mockResolvedValue(mockTasks);

      const result = await resolver.tasks();

      expect(result).toBe(mockTasks);
      expect(taskService.getAll).toHaveBeenCalledWith(undefined);
    });
  });
});
