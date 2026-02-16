import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { getTableName } from '../../../utils/tableNameMapping';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class SpaceCollaborationLoaderCreator
  implements DataLoaderCreator<ICollaboration>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<ICollaboration>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    const tableName = getTableName(options.parentClassRef.name);

    return createTypedRelationDataLoader(
      this.db,
      tableName,
      { collaboration: true },
      this.constructor.name,
      options
    );
  }
}
