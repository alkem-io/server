import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { User } from '@domain/community/user';
import { Organization } from '@domain/community/organization';
import { AUTH_RESET_SERVICE } from '@common/constants';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { TaskService } from '@services/task/task.service';
import { AUTH_RESET_EVENT_TYPE } from '../event.type';
import { AuthResetEventPayload } from '../auth-reset.payload.interface';
import { BaseException } from '@common/exceptions/base.exception';
import { Account } from '@domain/space/account/account.entity';

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
      await this.publishAllAccountsReset(task.id);
      await this.publishAllOrganizationsReset(task.id);
      await this.publishAllUsersReset(task.id);
      await this.publishPlatformReset();
    } catch (error) {
      throw new BaseException(
        `Error while initializing authorization reset: ${error}`,
        LogContext.AUTH,
        AlkemioErrorStatus.AUTHORIZATION_RESET
      );
    }

    return task.id;
  }

  public async publishAllAccountsReset(taskId?: string) {
    const accounts = await this.manager.find(Account, {
      select: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(accounts.length);

    accounts.forEach(({ id }) =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(
        AUTH_RESET_EVENT_TYPE.ACCOUNT,
        { id, type: AUTH_RESET_EVENT_TYPE.ACCOUNT, task: task.id }
      )
    );

    return task.id;
  }

  public async publishAllUsersReset(taskId?: string) {
    const users = await this.manager.find(User, {
      select: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(users.length);

    users.forEach(({ id }) =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(
        AUTH_RESET_EVENT_TYPE.USER,
        {
          id,
          type: AUTH_RESET_EVENT_TYPE.USER,
          task: task.id,
        }
      )
    );

    return task.id;
  }

  public async publishAllOrganizationsReset(taskId?: string) {
    const organizations = await this.manager.find(Organization, {
      select: { id: true },
    });

    const task = taskId
      ? { id: taskId }
      : await this.taskService.create(organizations.length);

    organizations.forEach(({ id }) =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(
        AUTH_RESET_EVENT_TYPE.ORGANIZATION,
        { id, type: AUTH_RESET_EVENT_TYPE.ORGANIZATION, task: task.id }
      )
    );

    return task.id;
  }

  public async publishPlatformReset() {
    // does not need a task
    this.authResetQueue.emit<any, any>(AUTH_RESET_EVENT_TYPE.PLATFORM, {});
  }
}
