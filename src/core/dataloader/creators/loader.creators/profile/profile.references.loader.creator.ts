import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IReference } from '@domain/common/reference';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ProfileReferencesLoaderCreator
  implements DataLoaderCreator<IReference[]>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IReference[]>) {
    return createTypedRelationDataLoader(
      this.db,
      'profiles',
      { references: true },
      this.constructor.name,
      options
    );
  }
}
