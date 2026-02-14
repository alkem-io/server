import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { Inject, Injectable } from '@nestjs/common';
import { IUser } from '@src/domain/community/user/user.interface';
import { createTypedSimpleDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class UserLoaderCreator implements DataLoaderCreator<IUser> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IUser>) {
    return createTypedSimpleDataLoader(
      this.db,
      'users',
      this.constructor.name,
      options
    );
  }
}
