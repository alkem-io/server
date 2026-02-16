import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { ILicense } from '@domain/common/license/license.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../utils';
import { getTableName } from '../../utils/tableNameMapping';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class LicenseLoaderCreator implements DataLoaderCreator<ILicense> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(
    options?: DataLoaderCreatorOptions<
      ILicense,
      { id: string; license?: ILicense }
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
        license: true,
      },
      this.constructor.name,
      options
    );
  }
}
