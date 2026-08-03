import { AUTH_RESET_SERVICE } from '@common/constants';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { Organization } from '@domain/community/organization';
import { User } from '@domain/community/user/user.entity';
import { Account } from '@domain/space/account/account.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectEntityManager } from '@nestjs/typeorm';
import { TaskService } from '@services/task/task.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  EntityManager,
  EntityTarget,
  FindOptionsSelect,
  ObjectLiteral,
} from 'typeorm';
import { AuthResetEventPayload } from '../auth-reset.payload.interface';
import { RESET_EVENT_TYPE } from '../reset.event.type';

@Injectable()
export class AuthResetService {
  constructor(
    @Inject(AUTH_RESET_SERVICE)
    private authResetQueue: ClientProxy,
    @InjectEntityManager() private manager: EntityManager,
    private taskService: TaskService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private logger: LoggerService
  ) {}

  /**
   * Publishes the full platform reset and returns the id of the task tracking it.
   *
   * The task is created with its true `itemsCount` **before** the first message
   * is emitted. Without that count the task can never reach a terminal status,
   * so the id it hands back is useless as a completion signal for the operators
   * our migration notes tell to run this.
   */
  public async publishResetAll(taskId?: string) {
    // Declared OUTSIDE the try so the catch can reach it. If a publisher throws
    // partway through — the RMQ channel dropping while the licence resets are
    // emitted, say — the remaining messages are never sent, so the task can
    // never reach its target. Left alone it would sit IN_PROGRESS forever and
    // permanently pollute getAll(IN_PROGRESS); it has to be failed explicitly.
    let task: { id: string } | undefined;

    try {
      // Fetch the three id sets ONCE, up front. This is what makes the count
      // trustworthy: the ids counted are exactly the ids emitted. A separate
      // COUNT(*) could drift from the subsequent SELECT (a row created or
      // deleted in between), leaving the task permanently one item short of
      // its target — i.e. hanging, which is the very bug being fixed here.
      // It is also cheaper than the status quo: 3 id-only selects instead of
      // the 5 the per-entity publishers each ran on their own.
      const [accountIds, organizationIds, userIds] = await Promise.all([
        this.findAllIds(Account),
        this.findAllIds(Organization),
        this.findAllIds(User),
      ]);

      // Accounts and organizations are each reset twice (authorization AND
      // licence); users once. The two platform-level resets emitted below
      // (AUTHORIZATION_RESET_PLATFORM, AUTHORIZATION_RESET_AI_SERVER)
      // deliberately carry no task id, so the subscriber never accounts for
      // them — counting them here would leave the task 2 items short forever.
      const itemsCount =
        accountIds.length * 2 + organizationIds.length * 2 + userIds.length;

      // A caller-supplied task was necessarily created without a count (every
      // external creator calls taskService.create() with no argument), so it
      // has to be told the total — otherwise the count computed just above is
      // thrown away and the task has no target to reach.
      task = taskId
        ? await this.taskService.setItemsCount(taskId, itemsCount)
        : await this.taskService.create(itemsCount);

      // The pre-fetched ids are handed down so the publishers below re-use them
      // instead of re-querying (and possibly emitting a different number of
      // messages than the count promised).
      await this.publishAuthorizationResetAllAccounts(task.id, accountIds);
      await this.publishAuthorizationResetAllOrganizations(
        task.id,
        organizationIds
      );
      await this.publishAuthorizationResetAllUsers(task.id, userIds);
      await this.publishAuthorizationResetPlatform();
      await this.publishAuthorizationResetAiServer();
      // And reset licenses
      await this.publishLicenseResetAllAccounts(task.id, accountIds);
      await this.publishLicenseResetAllOrganizations(task.id, organizationIds);

      return task.id;
    } catch (error) {
      // Fail the task explicitly if it got as far as being created. Whatever
      // was not emitted will never arrive, so waiting for the counter to reach
      // its target is waiting forever.
      if (task) {
        try {
          // Task errors are surfaced to operators through the `task` query, so
          // this string stays stable and free of interpolated internals. The
          // diagnosis lives in the log line and in the exception details below.
          await this.taskService.completeWithError(
            task.id,
            'Reset publishing failed before all events were emitted'
          );
        } catch (completionError: any) {
          this.logger.error(
            `Failed to mark task '${task.id}' as errored: ${completionError}`,
            completionError?.stack,
            LogContext.AUTH
          );
        }
      }

      this.logger.error(
        `Error while initializing authorization reset: ${error}`,
        (error as Error)?.stack,
        LogContext.AUTH
      );

      throw new BaseException(
        'Error while initializing authorization reset',
        LogContext.AUTH,
        AlkemioErrorStatus.AUTHORIZATION_RESET,
        { originalException: error }
      );
    }
  }

  /** Select just the ids of every row of an entity. */
  private async findAllIds<T extends ObjectLiteral & { id: string }>(
    entity: EntityTarget<T>
  ): Promise<string[]> {
    const rows = await this.manager.find(entity, {
      select: { id: true } as FindOptionsSelect<T>,
    });

    return rows.map(({ id }) => id);
  }

  /** Emit one reset event per id, all tagged with the same tracking task. */
  private emitResetEvents(
    ids: string[],
    type: RESET_EVENT_TYPE,
    taskId: string
  ): void {
    ids.forEach(id =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(type, {
        id,
        type,
        task: taskId,
      })
    );
  }

  /**
   * @param taskId Track against an existing task instead of creating one.
   * @param accountIds Pre-fetched ids, supplied by {@link publishResetAll} so the
   *   aggregate task's `itemsCount` matches the messages actually emitted.
   *   Omitted when this publisher is invoked standalone.
   */
  public async publishAuthorizationResetAllAccounts(
    taskId?: string,
    accountIds?: string[]
  ) {
    const ids = accountIds ?? (await this.findAllIds(Account));

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(ids.length);

    this.emitResetEvents(
      ids,
      RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT,
      task.id
    );

    return task.id;
  }

  /** @see publishAuthorizationResetAllAccounts for the parameters. */
  public async publishLicenseResetAllAccounts(
    taskId?: string,
    accountIds?: string[]
  ) {
    const ids = accountIds ?? (await this.findAllIds(Account));

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(ids.length);

    this.emitResetEvents(ids, RESET_EVENT_TYPE.LICENSE_RESET_ACCOUNT, task.id);

    return task.id;
  }

  /** @see publishAuthorizationResetAllAccounts for the parameters. */
  public async publishLicenseResetAllOrganizations(
    taskId?: string,
    organizationIds?: string[]
  ) {
    const ids = organizationIds ?? (await this.findAllIds(Organization));

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(ids.length);

    this.emitResetEvents(
      ids,
      RESET_EVENT_TYPE.LICENSE_RESET_ORGANIZATION,
      task.id
    );

    return task.id;
  }

  /** @see publishAuthorizationResetAllAccounts for the parameters. */
  public async publishAuthorizationResetAllUsers(
    taskId?: string,
    userIds?: string[]
  ) {
    const ids = userIds ?? (await this.findAllIds(User));

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(ids.length);

    this.emitResetEvents(
      ids,
      RESET_EVENT_TYPE.AUTHORIZATION_RESET_USER,
      task.id
    );

    return task.id;
  }

  /** @see publishAuthorizationResetAllAccounts for the parameters. */
  public async publishAuthorizationResetAllOrganizations(
    taskId?: string,
    organizationIds?: string[]
  ) {
    const ids = organizationIds ?? (await this.findAllIds(Organization));

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(ids.length);

    this.emitResetEvents(
      ids,
      RESET_EVENT_TYPE.AUTHORIZATION_RESET_ORGANIZATION,
      task.id
    );

    return task.id;
  }

  public async publishAuthorizationResetPlatform() {
    // does not need a task
    this.authResetQueue.emit<any, any>(
      RESET_EVENT_TYPE.AUTHORIZATION_RESET_PLATFORM,
      {}
    );
    this.authResetQueue.emit<any, any>(
      RESET_EVENT_TYPE.LICENSE_RESET_PLATFORM,
      {}
    );
  }

  public async publishAuthorizationResetAiServer() {
    // does not need a task
    this.authResetQueue.emit<any, any>(
      RESET_EVENT_TYPE.AUTHORIZATION_RESET_AI_SERVER,
      {}
    );
  }
}
