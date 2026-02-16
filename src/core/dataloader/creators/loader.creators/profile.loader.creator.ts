import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IProfile } from '@domain/common/profile';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../utils';
import { getTableName } from '../../utils/tableNameMapping';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class ProfileLoaderCreator implements DataLoaderCreator<IProfile> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(
    options?: DataLoaderCreatorOptions<
      IProfile,
      { id: string; profile?: IProfile }
    >
  ) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    const tableName = getTableName(options.parentClassRef.name);

    return createTypedRelationDataLoader(
      this.db,
      tableName,
      {
        profile: true,
      },
      this.constructor.name,
      options
    );
  }
}
