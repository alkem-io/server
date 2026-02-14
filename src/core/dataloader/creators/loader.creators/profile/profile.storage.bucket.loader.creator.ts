import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Inject, Injectable } from '@nestjs/common';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ProfileStorageBucketLoaderCreator
  implements DataLoaderCreator<IStorageBucket>
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  create(options: DataLoaderCreatorOptions<IStorageBucket>) {
    return createTypedRelationDataLoader(
      this.db,
      'profiles',
      { storageBucket: true },
      this.constructor.name,
      options
    );
  }
}
