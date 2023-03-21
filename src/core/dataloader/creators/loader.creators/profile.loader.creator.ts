import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { IProfile } from '@domain/common/profile';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class ProfileLoaderCreator implements DataLoaderCreator<IProfile> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(
    options?: DataLoaderCreatorOptions<
      IProfile,
      { id: string; profile?: IProfile }
    >
  ) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedRelationDataLoader(
      this.manager,
      options.parentClassRef,
      {
        profile: true,
      },
      this.constructor.name,
      options
    );
  }
}
