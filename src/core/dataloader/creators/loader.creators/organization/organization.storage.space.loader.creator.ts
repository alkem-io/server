import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { Organization } from '@domain/community/organization/organization.entity';

@Injectable()
export class OrganizationStorageBucketLoaderCreator
  implements DataLoaderCreator<IStorageBucket[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IStorageBucket[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Organization,
      { storageBucket: true },
      this.constructor.name,
      options
    );
  }
}
