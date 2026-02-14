import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class CollaborationCalloutsSetLoaderCreator
  implements DataLoaderCreator<ICalloutsSet[]>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<ICalloutsSet[]>) {
    return createTypedRelationDataLoader(
      this.db,
      'collaborations',
      { calloutsSet: true },
      this.constructor.name,
      options
    );
  }
}
