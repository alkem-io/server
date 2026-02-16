import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class OrganizationStorageAggregatorLoaderCreator
  implements DataLoaderCreator<IStorageAggregator[]>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IStorageAggregator[]>) {
    return createTypedRelationDataLoader(
      this.db,
      'organizations',
      { storageAggregator: true },
      this.constructor.name,
      options
    );
  }
}
