import { vi } from 'vitest';
import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { TaskService } from '@services/task';

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
