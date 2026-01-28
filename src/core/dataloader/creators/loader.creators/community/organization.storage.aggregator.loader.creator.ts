import { Organization } from '@domain/community/organization/organization.entity';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class OrganizationStorageAggregatorLoaderCreator
  implements DataLoaderCreator<IStorageAggregator[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<IStorageAggregator[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Organization,
      { storageAggregator: true },
      this.constructor.name,
      options
    );
  }
}
