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
import { EntityManager } from 'typeorm';
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
    const accounts = await this.manager.find(Account, {
      select: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(accounts.length);

    accounts.forEach(({ id }) =>
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
    const accounts = await this.manager.find(Account, {
      select: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(accounts.length);

    accounts.forEach(({ id }) =>
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
    const organizations = await this.manager.find(Organization, {
      select: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(organizations.length);

    organizations.forEach(({ id }) =>
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
    const users = await this.manager.find(User, {
      select: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(users.length);

    users.forEach(({ id }) =>
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
    const organizations = await this.manager.find(Organization, {
      select: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(organizations.length);

    organizations.forEach(({ id }) =>
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
