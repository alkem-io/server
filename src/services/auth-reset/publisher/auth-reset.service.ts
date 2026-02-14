import { AUTH_RESET_SERVICE } from '@common/constants';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { BaseException } from '@common/exceptions/base.exception';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { organizations } from '@domain/community/organization/organization.schema';
import { users } from '@domain/community/user/user.schema';
import { accounts } from '@domain/space/account/account.schema';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TaskService } from '@services/task/task.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthResetEventPayload } from '../auth-reset.payload.interface';
import { RESET_EVENT_TYPE } from '../reset.event.type';

@Injectable()
export class AuthResetService {
  constructor(
    @Inject(AUTH_RESET_SERVICE)
    private authResetQueue: ClientProxy,
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private taskService: TaskService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private logger: LoggerService
  ) {}

  public async publishResetAll(taskId?: string) {
    const task = taskId ? { id: taskId } : await this.taskService.create();

    try {
      await this.publishAuthorizationResetAllAccounts(task.id);
      await this.publishAuthorizationResetAllOrganizations(task.id);
      await this.publishAuthorizationResetAllUsers(task.id);
      await this.publishAuthorizationResetPlatform();
      await this.publishAuthorizationResetAiServer();
      // And reset licenses
      await this.publishLicenseResetAllAccounts(task.id);
      await this.publishLicenseResetAllOrganizations(task.id);
    } catch (error) {
      throw new BaseException(
        `Error while initializing authorization reset: ${error}`,
        LogContext.AUTH,
        AlkemioErrorStatus.AUTHORIZATION_RESET
      );
    }

    return task.id;
  }

  public async publishAuthorizationResetAllAccounts(taskId?: string) {
    const allAccounts = await this.db.query.accounts.findMany({
      columns: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(allAccounts.length);

    allAccounts.forEach(({ id }) =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(
        RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT,
        {
          id,
          type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_ACCOUNT,
          task: task.id,
        }
      )
    );

    return task.id;
  }

  public async publishLicenseResetAllAccounts(taskId?: string) {
    const allAccounts = await this.db.query.accounts.findMany({
      columns: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(allAccounts.length);

    allAccounts.forEach(({ id }) =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(
        RESET_EVENT_TYPE.LICENSE_RESET_ACCOUNT,
        {
          id,
          type: RESET_EVENT_TYPE.LICENSE_RESET_ACCOUNT,
          task: task.id,
        }
      )
    );

    return task.id;
  }

  public async publishLicenseResetAllOrganizations(taskId?: string) {
    const allOrganizations = await this.db.query.organizations.findMany({
      columns: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(allOrganizations.length);

    allOrganizations.forEach(({ id }) =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(
        RESET_EVENT_TYPE.LICENSE_RESET_ORGANIZATION,
        {
          id,
          type: RESET_EVENT_TYPE.LICENSE_RESET_ORGANIZATION,
          task: task.id,
        }
      )
    );

    return task.id;
  }

  public async publishAuthorizationResetAllUsers(taskId?: string) {
    const allUsers = await this.db.query.users.findMany({
      columns: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(allUsers.length);

    allUsers.forEach(({ id }) =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(
        RESET_EVENT_TYPE.AUTHORIZATION_RESET_USER,
        {
          id,
          type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_USER,
          task: task.id,
        }
      )
    );

    return task.id;
  }

  public async publishAuthorizationResetAllOrganizations(taskId?: string) {
    const allOrganizations = await this.db.query.organizations.findMany({
      columns: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(allOrganizations.length);

    allOrganizations.forEach(({ id }) =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(
        RESET_EVENT_TYPE.AUTHORIZATION_RESET_ORGANIZATION,
        {
          id,
          type: RESET_EVENT_TYPE.AUTHORIZATION_RESET_ORGANIZATION,
          task: task.id,
        }
      )
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
