import { Profile } from '@domain/common/profile';
import { ITagset } from '@domain/common/tagset';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ProfileTagsetsLoaderCreator
  implements DataLoaderCreator<ITagset[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<ITagset[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Profile,
      { tagsets: true },
      this.constructor.name,
      options
    );
  }
}
