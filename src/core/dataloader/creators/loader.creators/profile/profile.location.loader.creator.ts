import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { ILocation } from '@domain/common/location';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ProfileLocationLoaderCreator
  implements DataLoaderCreator<ILocation>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<ILocation>) {
    return createTypedRelationDataLoader(
      this.db,
      'profiles',
      { location: true },
      this.constructor.name,
      options
    );
  }
}
