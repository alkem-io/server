import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { randomUUID } from 'crypto';
import { Cache } from 'cache-manager';
import { TaskError, TaskResult } from '@services/task/types';
import { LogContext } from '@common/enums';
import { TaskStatus } from '@domain/task/dto/task.status.enum';
import { Task } from './task.interface';
import { TASK_LIST_CACHE_KEY } from './task.list.key';

const TTL = 3600;

@Injectable()
export class TaskService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getTaskList() {
    const list =
      await this.cacheManager.get<Array<string>>(TASK_LIST_CACHE_KEY);

    if (list) {
      return list;
    }

    this.logger.warn?.(
      'Task list not found. Creating a new one...',
      LogContext.TASKS
    );
    await this.cacheManager.set<Array<string>>(TASK_LIST_CACHE_KEY, [], {
      ttl: TTL,
    });
    return []; // set returns 'ok'
  }

  public async getAll(status = TaskStatus.IN_PROGRESS) {
    const list = await this.getTaskList();

    const resolved = await Promise.all(list.map(taskId => this.get(taskId)));

    let result = resolved.filter((x): x is Task => !!x);

    if (status) {
      result = result.filter(x => x.status === status);
    }

    return result;
  }

  public get(id: string) {
    return this.cacheManager.get<Task>(id);
  }

  public async getOrFail(id: string) {
    const task = await this.cacheManager.get<Task>(id);

    if (!task) {
      throw new Error(`Task '${id}' not found`);
    }

    return task;
  }

  public async create(itemsCount?: number) {
    const now = new Date().getTime();
    const task: Task = {
      id: randomUUID(),
      created: now,
      start: now, // has to change
      action: 'auth-reset',
      status: TaskStatus.IN_PROGRESS, // may not be accurate atm,
      itemsCount,
      itemsDone: itemsCount && 0,
      results: [],
      errors: [],
    };
    await this.cacheManager.set<Task>(task.id, task, {
      ttl: TTL,
    });
    await this.addTaskToList(task);
    return task;
  }

  /**
   *
   * @param id
   * @param result
   * @param completeItem Increase the itemsDone counter
   */
  public async updateTaskResults(
    id: string,
    result: TaskResult,
    completeItem = true
  ) {
    const task = await this.getOrFail(id);

    if (task.itemsDone !== undefined && completeItem) {
      task.itemsDone += 1;
    }

    if (task.itemsCount && task.itemsCount === task.itemsDone) {
      task.status = TaskStatus.COMPLETED;
    }

    task.results.unshift(`[${new Date().toISOString()}]::${result}`);

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  public async updateTaskErrors(
    id: string,
    error: TaskError,
    completeItem = true
  ) {
    const task = await this.getOrFail(id);

    if (task.itemsDone !== undefined && completeItem) {
      task.itemsDone += 1;
    }

    if (task.itemsCount === task.itemsDone) {
      task.status = TaskStatus.COMPLETED;
    }

    task.errors.unshift(error);

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  public async complete(
    id: string,
    status: TaskStatus.COMPLETED | TaskStatus.ERRORED = TaskStatus.COMPLETED
  ) {
    const task = await this.getOrFail(id);

    task.status = status;
    task.end = new Date().getTime();

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  public async completeWithError(id: string, error: string) {
    const task = await this.getOrFail(id);

    task.errors.unshift(error);
    task.status = TaskStatus.ERRORED;
    task.end = new Date().getTime();

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  private async addTaskToList(task: Task) {
    const list = await this.getTaskList();

    if (!list) {
      this.logger.error(
        'Could not add task to list. List not found.',
        undefined,
        LogContext.TASKS
      );
      return false;
    }

    list.push(task.id);

    return this.cacheManager
      .set(TASK_LIST_CACHE_KEY, list, { ttl: TTL })
      .then(
        () => true,
        reason => {
          this.logger.error(
            `Could not add task to list. ${reason}`,
            reason?.stack,
            LogContext.TASKS
          );
          return false;
        }
      )
      .catch(error => {
        this.logger.error(
          `Could not add task to list. ${error}`,
          error?.stack,
          LogContext.TASKS
        );
        return false;
      });
  }
}
