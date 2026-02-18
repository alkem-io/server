import { ValueProvider } from '@nestjs/common';
import { TaskService } from '@services/task';
import { vi } from 'vitest';
import { PublicPart } from '../utils/public-part';

export const MockTaskService: ValueProvider<PublicPart<TaskService>> = {
  provide: TaskService,
  useValue: {
    updateTaskErrors: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    getAll: vi.fn(),
    getTaskList: vi.fn(),
  },
};
