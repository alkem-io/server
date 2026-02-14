import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { ITagset } from '@domain/common/tagset';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ProfileTagsetsLoaderCreator
  implements DataLoaderCreator<ITagset[]>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<ITagset[]>) {
    return createTypedRelationDataLoader(
      this.db,
      'profiles',
      { tagsets: true },
      this.constructor.name,
      options
    );
  }
}
