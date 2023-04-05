import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { IStorageSpace } from '@domain/storage/storage-space/storage.space.interface';

@Injectable()
export class ChallengeStorageSpaceLoaderCreator
  implements DataLoaderCreator<IStorageSpace[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IStorageSpace[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Hub,
      { storageSpace: true },
      this.constructor.name,
      options
    );
  }
}
