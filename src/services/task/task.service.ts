import { LogContext } from '@common/enums';
import { TaskStatus } from '@domain/task/dto/task.status.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { TaskError, TaskResult } from '@services/task/types';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
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
      // An explicit count opts the task into progress tracking, so it starts at
      // zero. Without a count the task is unbounded and `itemsDone` stays
      // undefined — such a task is terminated explicitly via `complete()` /
      // `completeWithError()`, never by the counters.
      // NB: this used to read `itemsCount && 0`, which returns the *left*
      // operand when it is falsy — correct only by accident, and unreadable.
      itemsDone: itemsCount === undefined ? undefined : 0,
      results: [],
      errors: [],
    };

    // A counted task with nothing to do is already finished: no item update
    // will ever arrive to move it out of IN_PROGRESS.
    if (itemsCount === 0) {
      task.status = TaskStatus.COMPLETED;
      task.end = now;
    }

    await this.cacheManager.set<Task>(task.id, task, {
      ttl: TTL,
    });
    await this.addTaskToList(task);
    return task;
  }

  /**
   * Whether every item this task was created for has been accounted for —
   * i.e. it is a *counted* task and its counter has reached the target.
   *
   * An uncounted task (no `itemsCount`) is never "finished" by this rule: it
   * has no target to reach, so it can only be terminated explicitly. This is
   * the guard that must be applied identically on the success and the error
   * path — omitting it on one of them made `undefined === undefined` true and
   * completed an uncounted task on its very first error.
   */
  private isFullyAccountedFor(task: Task): boolean {
    return (
      task.itemsCount !== undefined &&
      task.itemsDone !== undefined &&
      // `>=` rather than `===` so an over-count (a racing extra item) still
      // terminates the task instead of stepping over the equality and hanging.
      task.itemsDone >= task.itemsCount
    );
  }

  /** Move a fully-accounted-for task into its terminal state. */
  private finish(
    task: Task,
    status: TaskStatus.COMPLETED | TaskStatus.ERRORED
  ) {
    task.status = status;
    task.end = new Date().getTime();
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

    task.results.unshift(`[${new Date().toISOString()}]::${result}`);

    if (this.isFullyAccountedFor(task)) {
      // Every item is in, but some of them failed — a run that lost items is
      // not a successful run, so it settles as ERRORED.
      this.finish(
        task,
        task.errors.length > 0 ? TaskStatus.ERRORED : TaskStatus.COMPLETED
      );
    }

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

    task.errors.unshift(error);

    // Only once the LAST item is accounted for — an error on item 1 of N must
    // not terminate the task; the remaining items are still being processed.
    if (this.isFullyAccountedFor(task)) {
      this.finish(task, TaskStatus.ERRORED);
    }

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
