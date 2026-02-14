import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IApplication } from '@domain/access/application';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedSimpleDataLoader } from '../../utils/createTypedSimpleLoader';
import { DataLoaderCreator } from '../base/data.loader.creator';
import { DataLoaderCreatorOptions } from '../base/data.loader.creator.options';

@Injectable()
export class RoleSetApplicationLoaderCreator
  implements DataLoaderCreator<IApplication>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IApplication>) {
    return createTypedSimpleDataLoader(
      this.db,
      'applications',
      this.constructor.name,
      options
    );
  }
}
