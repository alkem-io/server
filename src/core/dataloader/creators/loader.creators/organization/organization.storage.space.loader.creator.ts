import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { IStorageSpace } from '@domain/storage/storage-space/storage.space.interface';
import { Organization } from '@domain/community/organization/organization.entity';

@Injectable()
export class OrganizationStorageSpaceLoaderCreator
  implements DataLoaderCreator<IStorageSpace[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IStorageSpace[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Organization,
      { storageSpace: true },
      this.constructor.name,
      options
    );
  }
}
