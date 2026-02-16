import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { ICommunity } from '@domain/community/community';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { getTableName } from '../../../utils/tableNameMapping';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class SpaceCommunityLoaderCreator
  implements DataLoaderCreator<ICommunity>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<ICommunity>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    const tableName = getTableName(options.parentClassRef.name);

    return createTypedRelationDataLoader(
      this.db,
      tableName,
      { community: true },
      this.constructor.name,
      options
    );
  }
}
