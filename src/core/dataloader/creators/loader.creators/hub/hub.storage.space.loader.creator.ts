import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.space.interface';

@Injectable()
export class HubStorageBucketLoaderCreator
  implements DataLoaderCreator<IStorageBucket[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IStorageBucket[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Hub,
      { storageBucket: true },
      this.constructor.name,
      options
    );
  }
}
