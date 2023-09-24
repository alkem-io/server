import { TaskResult } from './task.result.interface';
import { TaskError } from './task.error.interface';
import { TaskStatus } from '@domain/task/dto';

export interface Task {
  /**
   * uuid of the task
   */
  readonly id: string;
  /**
   * the timestamp when the task was created
   */
  readonly created: number;
  /**
   * the timestamp when the task was started
   */
  readonly start: number;
  /**
   * the timestamp when the task was completed
   */
  end?: number;
  /**
   * tbd
   */
  type?: string;
  /**
   * the current status of the task
   */
  status: TaskStatus;
  /**
   * tbd
   */
  readonly action?: 'auth-reset' | string; // tbd
  /**
   * info about the completed part of the task
   */
  readonly results: Array<TaskResult>;
  /**
   * info about the errors of the task
   */
  readonly errors: Array<TaskError>;
  /**
   * amount of items that need to be processed
   */
  readonly itemsCount?: number;
  /**
   * amount of items that are already processed
   */
  itemsDone?: number;
}
