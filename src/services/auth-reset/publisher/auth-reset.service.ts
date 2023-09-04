import { Inject, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { ClientProxy } from '@nestjs/microservices';
import { User } from '@domain/community/user';
import { Organization } from '@domain/community/organization';
import { AUTH_RESET_SERVICE } from '@common/constants';

@Injectable()
export class AuthResetService {
  constructor(
    @Inject(AUTH_RESET_SERVICE)
    private authResetQueue: ClientProxy,
    @InjectEntityManager() private manager: EntityManager
  ) {}

  public async publishAllSpaceReset() {
    const spaces = await this.manager.find(Space, {
      select: { id: true },
    });

    spaces.forEach(({ id }) => this.authResetQueue.emit('space-reset', { id }));
  }

  public async publishAllUsersReset() {
    const users = await this.manager.find(User, {
      select: { id: true },
    });

    users.forEach(({ id }) => this.authResetQueue.emit('user-reset', { id }));
  }

  public async publishAllOrganizationsReset() {
    const organizations = await this.manager.find(Organization, {
      select: { id: true },
    });

    organizations.forEach(({ id }) =>
      this.authResetQueue.emit('organization-reset', { id })
    );
  }

  public async publishPlatformReset() {
    this.authResetQueue.emit('platform-reset', {});
  }
}
