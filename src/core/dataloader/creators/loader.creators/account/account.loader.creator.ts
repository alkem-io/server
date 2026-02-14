import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { createTypedRelationDataLoader } from '@core/dataloader/utils';
import { getTableName } from '@core/dataloader/utils/tableNameMapping';
import { IAccount } from '@domain/space/account/account.interface';
import { Inject, Injectable } from '@nestjs/common';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class AccountLoaderCreator implements DataLoaderCreator<IAccount> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(
    options?: DataLoaderCreatorOptions<
      IAccount,
      { id: string; account?: IAccount }
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
        account: true,
      },
      this.constructor.name,
      options
    );
  }
}
