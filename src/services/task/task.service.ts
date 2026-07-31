import { LogContext } from '@common/enums';
import {
  RedisCache,
  RedisClientLike,
  RedisStore,
} from '@common/interfaces/redis.interfaces';
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

  // ------------------------------------------------------------- counters
  //
  // The item counters CANNOT live in the cached Task object alone.
  //
  // The auth-reset queue is consumed by competing consumers across pods:
  // `main.worker.ts` sets `prefetchCount: 1` precisely so "work is spread
  // across pods", and infrastructure-operations'
  // `41-auth-reset-worker-autoscaler.yml` scales the deployment to 10 replicas
  // the moment the queue is non-empty. They all share one Redis.
  //
  // `get(id) -> task.itemsDone += 1 -> set(id, task)` is a read-modify-write.
  // Two pods finishing at the same moment both read `k` and both write `k + 1`
  // — one increment is silently lost. That was harmless while `itemsCount` was
  // undefined and the counter purely decorative. It is NOT harmless now that
  // the terminal status is derived from the counter reaching its target: a
  // single lost increment undershoots the target forever and the task hangs,
  // which is precisely the defect (#6310) this service is being fixed for.
  // Note `>=` does not rescue it — lost updates undercount, never overcount.
  //
  // So the counters live in dedicated Redis keys mutated with INCR, which is
  // atomic. Where no Redis client is reachable (unit tests, or any non-redis
  // cache store) we fall back to the in-object counter, which is correct for
  // the single process those environments actually are.
  private readonly doneKey = (id: string) => `task:${id}:itemsDone`;
  private readonly errorsKey = (id: string) => `task:${id}:errorCount`;
  private readonly seenKey = (id: string) => `task:${id}:seen`;
  private readonly endKey = (id: string) => `task:${id}:end`;
  private readonly terminalKey = (id: string) => `task:${id}:terminal`;

  private redisClient(): RedisClientLike | undefined {
    const store = (this.cacheManager as Partial<RedisCache>).store as
      | Partial<RedisStore>
      | undefined;

    if (typeof store?.getClient !== 'function') {
      return undefined;
    }

    try {
      return store.getClient();
    } catch (error: any) {
      this.logger.warn?.(
        `Task counters: no Redis client available, falling back to in-object counters. ${error}`,
        LogContext.TASKS
      );
      return undefined;
    }
  }

  /**
   * Atomically increment a counter key and return its NEW value. The TTL is
   * refreshed on every increment so a long-running reset cannot outlive its
   * own counter and silently restart from zero.
   *
   * Returns undefined when there is no Redis to be atomic against — callers
   * fall back to the in-object counter.
   */
  private async incrementCounter(key: string): Promise<number | undefined> {
    const client = this.redisClient();

    if (!client) {
      return undefined;
    }

    return new Promise<number | undefined>(resolve => {
      client.incr(key, (err, value) => {
        if (err) {
          this.logger.error(
            `Failed to increment task counter '${key}': ${err}`,
            err?.stack,
            LogContext.TASKS
          );
          resolve(undefined);
          return;
        }
        // Best-effort TTL refresh; the counter value is already committed.
        client.expire(key, TTL, () => resolve(value));
      });
    });
  }

  /** Read a raw string key, or undefined when unset / no Redis. */
  private async readString(key: string): Promise<string | undefined> {
    const client = this.redisClient();

    if (!client) {
      return undefined;
    }

    return new Promise<string | undefined>(resolve => {
      client.get(key, (err, value) => {
        resolve(
          err || value === null || value === undefined ? undefined : value
        );
      });
    });
  }

  /** Read a counter key, or undefined when unset / no Redis. */
  private async readCounter(key: string): Promise<number | undefined> {
    const value = await this.readString(key);

    if (value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  /**
   * Record an EXPLICIT terminal state where a stale write cannot undo it.
   *
   * `complete()` / `completeWithError()` set the status on the cached object,
   * but a consumer that read the task just before them still holds a copy
   * saying IN_PROGRESS — and writing that copy back resurrects the task. For a
   * task terminated explicitly *because publishing failed*, the counter will
   * never reach `itemsCount` (the remaining events were never emitted), so the
   * counter-derived path cannot repair it and the task hangs. First stamp
   * wins, and the read overlay reapplies it.
   */
  private async stampTerminal(id: string, status: TaskStatus): Promise<void> {
    const client = this.redisClient();

    if (!client) {
      return;
    }

    return new Promise<void>(resolve => {
      client.setnx(this.terminalKey(id), String(status), err => {
        if (err) {
          this.logger.error(
            `Failed to stamp terminal status for task '${id}': ${err}`,
            err?.stack,
            LogContext.TASKS
          );
          resolve();
          return;
        }
        client.expire(this.terminalKey(id), TTL, () => resolve());
      });
    });
  }

  /**
   * Record the task's terminal timestamp where it cannot be clobbered.
   *
   * `end` lives on the Task object, and every consumer writes that whole
   * object back — so a slower consumer holding a copy taken before the task
   * settled will write `end: undefined` straight over the stamp. The result is
   * a COMPLETED task with no end time. SETNX keeps the FIRST stamp, and the
   * read overlay restores it, so the clobber becomes invisible.
   */
  private async stampEnd(id: string, end: number): Promise<void> {
    const client = this.redisClient();

    if (!client) {
      return;
    }

    return new Promise<void>(resolve => {
      client.setnx(this.endKey(id), String(end), err => {
        if (err) {
          this.logger.error(
            `Failed to stamp end for task '${id}': ${err}`,
            err?.stack,
            LogContext.TASKS
          );
          resolve();
          return;
        }
        client.expire(this.endKey(id), TTL, () => resolve());
      });
    });
  }

  /**
   * Claim an item for this task, exactly once.
   *
   * RabbitMQ is at-least-once, and `handleReset` re-publishes its retry BEFORE
   * acking the original — so a pod dying between those two lines guarantees a
   * redelivery. Counting that twice would push `itemsDone` to `itemsCount`
   * while real items are still queued: the task settles early, and every
   * genuine update after it is dropped by the terminal guard, so a run that
   * later fails an item can still report COMPLETED.
   *
   * `SADD` returns 1 only for a member that was not already in the set, which
   * makes it the claim. Returns true when the caller owns this item and should
   * account for it, false when it is a duplicate.
   *
   * Without Redis (or without an item identity) there is nothing to dedupe
   * against and every call is treated as a fresh item — the previous
   * behaviour.
   */
  private async claimItem(id: string, itemKey?: string): Promise<boolean> {
    const client = this.redisClient();

    if (!client || !itemKey) {
      return true;
    }

    return new Promise<boolean>(resolve => {
      client.sadd(this.seenKey(id), itemKey, (err, added) => {
        if (err) {
          this.logger.error(
            `Failed to claim task item '${itemKey}' on task '${id}': ${err}`,
            err?.stack,
            LogContext.TASKS
          );
          // Fail open: a dedupe outage must not stall a legitimate item.
          resolve(true);
          return;
        }
        client.expire(this.seenKey(id), TTL, () => resolve(added === 1));
      });
    });
  }

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

  public async get(id: string) {
    const task = await this.cacheManager.get<Task>(id);

    return task ? this.withAuthoritativeCounters(task) : task;
  }

  public async getOrFail(id: string) {
    const task = await this.get(id);

    if (!task) {
      throw new Error(`Task '${id}' not found`);
    }

    return task;
  }

  /**
   * Overlay the atomic counters onto a cached Task.
   *
   * The whole Task object is written back by every consumer, so the *stored*
   * `status` and `itemsDone` are themselves subject to a lost update: the pod
   * that observes the final increment writes COMPLETED, and a slower pod
   * holding a slightly stale copy can write IN_PROGRESS straight back over it.
   * The Redis counters cannot be clobbered that way, so they — not the stored
   * fields — are the source of truth for progress, and for whether a counted
   * task has finished.
   *
   * `end` is never invented here either — it is read back from the SETNX stamp
   * (see {@link stampEnd}), so a stale write that cleared it cannot leave a
   * terminal task without an end time.
   */
  private async withAuthoritativeCounters(task: Task): Promise<Task> {
    // Without Redis there is no out-of-band state to overlay, and nothing to
    // be clobbered by — a single process owns the object outright. Return it
    // by identity rather than as a copy, so callers keep mutating the same
    // instance they will write back.
    if (!this.redisClient()) {
      return task;
    }

    const [terminal, storedEnd] = await Promise.all([
      this.readString(this.terminalKey(task.id)),
      this.readCounter(this.endKey(task.id)),
    ]);

    const base: Task = { ...task, end: task.end ?? storedEnd };

    // An explicitly-terminated task outranks whatever the cached object says.
    // This is what survives a slow consumer writing its pre-termination copy
    // back over the terminal one — and it is the ONLY repair available when
    // publishing failed part-way, because the counter can then never reach
    // itemsCount for the derivation below to fire.
    if (
      base.status === TaskStatus.IN_PROGRESS &&
      (terminal === TaskStatus.COMPLETED || terminal === TaskStatus.ERRORED)
    ) {
      base.status = terminal;
    }

    // An uncounted task has no target to reach — it is terminated explicitly
    // via complete()/completeWithError(), so there is nothing more to derive.
    if (task.itemsCount === undefined) {
      return base;
    }

    const [done, errorCount] = await Promise.all([
      this.readCounter(this.doneKey(task.id)),
      this.readCounter(this.errorsKey(task.id)),
    ]);

    // No Redis (or no increments yet): the in-object counter is all there is.
    if (done === undefined) {
      return base;
    }

    // Never below what the task already recorded — increments taken while
    // Redis was unreachable live only in the stored object, and reporting a
    // lower number would look like the run went backwards.
    const resolved: Task = {
      ...base,
      itemsDone: Math.max(done, task.itemsDone ?? 0),
    };

    if (
      resolved.itemsDone !== undefined &&
      resolved.itemsDone >= task.itemsCount &&
      resolved.status === TaskStatus.IN_PROGRESS
    ) {
      resolved.status =
        (errorCount ?? resolved.errors.length) > 0
          ? TaskStatus.ERRORED
          : TaskStatus.COMPLETED;
    }

    return resolved;
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
    // will ever arrive to move it out of IN_PROGRESS. Routed through finish()
    // so every terminal transition in this service stamps `end` the same way.
    if (itemsCount === 0) {
      this.finish(task, TaskStatus.COMPLETED);
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
   * Account for one processed item, atomically where possible, and write the
   * authoritative count back onto the task. No-op for an uncounted task.
   */
  private async accountForItem(task: Task, completeItem: boolean) {
    if (task.itemsDone === undefined || !completeItem) {
      return;
    }

    const atomic = await this.incrementCounter(this.doneKey(task.id));

    // `atomic` is undefined only when there is no Redis to be atomic against —
    // a single-process environment, where the in-object increment is exact.
    //
    // Math.max, not a plain assignment: if Redis was briefly unreachable some
    // increments landed in-object only, so a reconnected INCR starts from a
    // value BELOW what the task has already recorded. Letting the counter
    // regress would undercount and strand the task IN_PROGRESS — the very
    // failure this counter exists to prevent. The counter only ever moves
    // forward.
    task.itemsDone =
      atomic === undefined
        ? task.itemsDone + 1
        : Math.max(atomic, task.itemsDone + 1);
  }

  /**
   *
   * @param id
   * @param result
   * @param completeItem Increase the itemsDone counter
   * @param itemKey Stable identity of the item being reported, used to make
   *   accounting idempotent under at-least-once delivery. Omit for callers
   *   with no per-item identity (their tasks are uncounted, so there is no
   *   target to settle early against).
   */
  public async updateTaskResults(
    id: string,
    result: TaskResult,
    completeItem = true,
    itemKey?: string
  ) {
    const task = await this.getOrFail(id);

    // Already settled. RabbitMQ is at-least-once and `handleReset` publishes
    // its retry BEFORE acking the original, so a pod killed between those two
    // lines gets the same item redelivered. Without this guard a late
    // duplicate flips a COMPLETED task to ERRORED and rewrites `end` — two
    // pollers reading a minute apart would disagree about the same run.
    if (task.status !== TaskStatus.IN_PROGRESS) {
      return;
    }

    // A redelivery of an item already counted must not advance the counter, or
    // the task settles before the outstanding items have been processed.
    if (!(await this.claimItem(id, itemKey))) {
      return;
    }

    await this.accountForItem(task, completeItem);

    task.results.unshift(`[${new Date().toISOString()}]::${result}`);

    if (this.isFullyAccountedFor(task)) {
      // Every item is in, but some of them failed — a run that lost items is
      // not a successful run, so it settles as ERRORED. The error tally is
      // read from the atomic counter for the same reason `itemsDone` is: the
      // `errors` array is written non-atomically and can lose entries.
      const errorCount =
        (await this.readCounter(this.errorsKey(id))) ?? task.errors.length;

      this.finish(
        task,
        errorCount > 0 ? TaskStatus.ERRORED : TaskStatus.COMPLETED
      );
      // Outside the cached object, where a stale write cannot erase it.
      await this.stampEnd(id, task.end as number);
    }

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  /**
   * @param itemKey See {@link updateTaskResults}. An item that already reported
   *   a result must not also report an error (or vice versa) — both claim the
   *   same identity, and the first claim wins.
   */
  public async updateTaskErrors(
    id: string,
    error: TaskError,
    completeItem = true,
    itemKey?: string
  ) {
    const task = await this.getOrFail(id);

    // See updateTaskResults — a redelivered failure must not re-stamp a task
    // that has already settled.
    if (task.status !== TaskStatus.IN_PROGRESS) {
      return;
    }

    if (!(await this.claimItem(id, itemKey))) {
      return;
    }

    // Tally the error atomically so the success path can trust it when it
    // decides between COMPLETED and ERRORED.
    await this.incrementCounter(this.errorsKey(id));
    await this.accountForItem(task, completeItem);

    task.errors.unshift(error);

    // Only once the LAST item is accounted for — an error on item 1 of N must
    // not terminate the task; the remaining items are still being processed.
    if (this.isFullyAccountedFor(task)) {
      this.finish(task, TaskStatus.ERRORED);
      await this.stampEnd(id, task.end as number);
    }

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  /**
   * Attach an item count to an EXISTING task, so a caller that created its own
   * (necessarily uncounted) task id can still hand it to a producer that knows
   * the real total.
   *
   * Without this, passing a pre-made task id into a counted run silently
   * discarded the computed count and left the task with no target to reach —
   * i.e. #6310 all over again, just via a different door.
   */
  public async setItemsCount(id: string, itemsCount: number) {
    const existing = await this.getOrFail(id);

    // Stamping a count is a one-shot on a fresh task. Re-stamping one that is
    // already counted would reset `itemsDone` to zero underneath consumers
    // that have already reported progress, silently corrupting the very
    // counter the terminal status is derived from — so refuse rather than
    // corrupt.
    if (existing.itemsCount !== undefined) {
      throw new Error(
        `Task '${id}' already has an itemsCount (${existing.itemsCount}); refusing to re-count it`
      );
    }

    // `itemsCount` is readonly on the interface, so rebuild rather than cast
    // the guarantee away.
    const task: Task = {
      ...existing,
      itemsCount,
      itemsDone: 0,
    };

    if (itemsCount === 0) {
      this.finish(task, TaskStatus.COMPLETED);
    }

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });

    return task;
  }

  public async complete(
    id: string,
    status: TaskStatus.COMPLETED | TaskStatus.ERRORED = TaskStatus.COMPLETED
  ) {
    const task = await this.getOrFail(id);

    this.finish(task, status);
    // Outside the cached object: a consumer that read this task just before
    // now still holds an IN_PROGRESS copy and will write it back.
    await this.stampTerminal(id, status);
    await this.stampEnd(id, task.end as number);

    await this.cacheManager.set(task.id, task, {
      ttl: TTL,
    });
  }

  public async completeWithError(id: string, error: string) {
    const task = await this.getOrFail(id);

    task.errors.unshift(error);
    this.finish(task, TaskStatus.ERRORED);
    await this.stampTerminal(id, TaskStatus.ERRORED);
    await this.stampEnd(id, task.end as number);

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
