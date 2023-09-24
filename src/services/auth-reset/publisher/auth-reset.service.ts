import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { ClientProxy } from '@nestjs/microservices';
import { User } from '@domain/community/user';
import { Organization } from '@domain/community/organization';
import { AUTH_RESET_SERVICE } from '@common/constants';
import { TaskService } from '@services/task/task.service';
import { AUTH_RESET_EVENT_TYPE } from '../event.type';
import { AuthResetEventPayload } from '../auth-reset.payload.interface';

@Injectable()
export class AuthResetService {
  constructor(
    @Inject(AUTH_RESET_SERVICE)
    private authResetQueue: ClientProxy,
    @InjectEntityManager() private manager: EntityManager,
    private taskService: TaskService
  ) {}

  public async publishAllSpaceReset() {
    const spaces = await this.manager.find(Space, {
      select: { id: true },
    });

    const task = await this.taskService.create(spaces.length);

    spaces.forEach(({ id }) =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(
        AUTH_RESET_EVENT_TYPE.SPACE,
        { id, type: AUTH_RESET_EVENT_TYPE.SPACE, task: task.id }
      )
    );
  }

  public async publishAllUsersReset() {
    const users = await this.manager.find(User, {
      select: { id: true },
    });

    const task = await this.taskService.create(users.length);

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
  }

  public async publishAllOrganizationsReset() {
    const organizations = await this.manager.find(Organization, {
      select: { id: true },
    });

    const task = await this.taskService.create(organizations.length);

    organizations.forEach(({ id }) =>
      this.authResetQueue.emit<any, AuthResetEventPayload>(
        AUTH_RESET_EVENT_TYPE.ORGANIZATION,
        { id, type: AUTH_RESET_EVENT_TYPE.ORGANIZATION, task: task.id }
      )
    );
  }

  public async publishPlatformReset() {
    // does not need a task
    this.authResetQueue.emit<any, any>(AUTH_RESET_EVENT_TYPE.PLATFORM, {});
  }
}
