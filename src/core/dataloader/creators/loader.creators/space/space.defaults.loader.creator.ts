import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Space } from '@domain/challenge/space/space.entity';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { ISpaceDefaults } from '@domain/challenge/space.defaults/space.defaults.interface';

@Injectable()
export class SpaceDefaultsLoaderCreator
  implements DataLoaderCreator<ISpaceDefaults[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ISpaceDefaults[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Space,
      { defaults: true },
      this.constructor.name,
      options
    );
  }
}
