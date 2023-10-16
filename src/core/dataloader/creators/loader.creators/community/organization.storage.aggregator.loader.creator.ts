import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { IStorageBucket as IStorageAggregator } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Organization } from '@domain/community/organization/organization.entity';

@Injectable()
export class OrganizationStorageAggregatorLoaderCreator
  implements DataLoaderCreator<IStorageAggregator[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IStorageAggregator[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Organization,
      { storageAggregator: true },
      this.constructor.name,
      options
    );
  }
}
