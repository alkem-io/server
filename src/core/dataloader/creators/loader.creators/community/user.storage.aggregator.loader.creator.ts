import { User } from '@domain/community/user/user.entity';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class UserStorageAggregatorLoaderCreator
  implements DataLoaderCreator<IStorageAggregator[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<IStorageAggregator[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      User,
      { storageAggregator: true },
      this.constructor.name,
      options
    );
  }
}
