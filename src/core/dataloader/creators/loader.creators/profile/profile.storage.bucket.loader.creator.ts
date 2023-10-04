import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Profile } from '@domain/common/profile';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';

@Injectable()
export class ProfileStorageBucketLoaderCreator
  implements DataLoaderCreator<IStorageBucket>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IStorageBucket>) {
    return createTypedRelationDataLoader(
      this.manager,
      Profile,
      { storageBucket: true },
      this.constructor.name,
      options
    );
  }
}
