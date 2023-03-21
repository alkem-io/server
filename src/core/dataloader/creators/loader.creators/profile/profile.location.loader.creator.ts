import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Profile } from '@domain/common/profile';
import { ILocation } from '@domain/common/location';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ProfileLocationLoaderCreator
  implements DataLoaderCreator<ILocation>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ILocation>) {
    return createTypedRelationDataLoader(
      this.manager,
      Profile,
      { location: true },
      this.constructor.name,
      options
    );
  }
}
