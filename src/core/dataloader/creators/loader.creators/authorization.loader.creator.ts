import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../utils';
import { getTableName } from '../../utils/tableNameMapping';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class AuthorizationLoaderCreator
  implements DataLoaderCreator<IAuthorizationPolicy>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(
    options?: DataLoaderCreatorOptions<IAuthorizationPolicy, AuthorizableEntity>
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
      { authorization: true },
      this.constructor.name,
      options
    );
  }
}
