import { User } from '@domain/community/user/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IUser } from '@src/domain/community/user/user.interface';
import { EntityManager } from 'typeorm';
import { createTypedSimpleDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class UserLoaderCreator implements DataLoaderCreator<IUser> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<IUser>) {
    return createTypedSimpleDataLoader(
      this.manager,
      User,
      this.constructor.name,
      options
    );
  }
}
