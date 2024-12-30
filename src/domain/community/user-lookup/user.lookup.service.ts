import { EntityManager, FindOneOptions } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { User } from '../user/user.entity';
import { IUser } from '../user/user.interface';

export class UserLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async getUserByUUID(
    userID: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser | null> {
    const user: IUser | null = await this.entityManager.findOne(User, {
      where: {
        id: userID,
      },
      ...options,
    });

    return user;
  }
  public async getUserByNameIdOrFail(
    userNameID: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser> {
    const user: IUser | null = await this.entityManager.findOne(User, {
      where: {
        nameID: userNameID,
      },
      ...options,
    });
    if (!user) {
      throw new EntityNotFoundException(
        `User with nameId ${userNameID} not found`,
        LogContext.COMMUNITY
      );
    }
    return user;
  }

  public async getUserByUuidOrFail(
    userID: string,
    options?: FindOneOptions<User> | undefined
  ): Promise<IUser> {
    const user = await this.getUserByUUID(userID, options);
    if (!user) {
      throw new EntityNotFoundException(
        `User with id ${userID} not found`,
        LogContext.COMMUNITY
      );
    }
    return user;
  }
}
