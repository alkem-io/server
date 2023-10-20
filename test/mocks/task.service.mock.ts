import { ValueProvider } from '@nestjs/common';
import { PublicPart } from '../utils/public-part';
import { TaskService } from '@services/task';

export const MockTaskService: ValueProvider<PublicPart<TaskService>> = {
  provide: TaskService,
  useValue: {
    updateTaskErrors: jest.fn(),
    create: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    getTaskList: jest.fn(),
  },
};
