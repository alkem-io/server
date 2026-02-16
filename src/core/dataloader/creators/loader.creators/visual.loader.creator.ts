import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IVisual } from '@domain/common/visual';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../utils';
import { getTableName } from '../../utils/tableNameMapping';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class VisualLoaderCreator implements DataLoaderCreator<IVisual> {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(
    options?: DataLoaderCreatorOptions<
      IVisual,
      { id: string; visuals?: IVisual }
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
      { visuals: true },
      this.constructor.name,
      options
    );
  }
}
