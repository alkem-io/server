import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { IProfile, User } from '@src/domain';
import { createTypedDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class UserProfileLoaderCreator implements DataLoaderCreator<IProfile> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IProfile>) {
    return createTypedDataLoader(
      this.manager,
      User,
      { profile: true },
      this.constructor.name,
      options
    );
  }
}
