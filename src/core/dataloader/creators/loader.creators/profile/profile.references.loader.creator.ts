import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Profile } from '@src/domain';
import { IReference } from '@domain/common/reference';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ProfileReferencesLoaderCreator
  implements DataLoaderCreator<IReference[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IReference[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Profile,
      { references: true },
      this.constructor.name,
      options
    );
  }
}
