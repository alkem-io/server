import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IPreference } from '@domain/common/preference';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { PreferenceSet } from '@domain/common/preference-set';
import { createTypedRelationDataLoader } from '../../utils';
import {
  DataLoaderCreator,
  DataLoaderCreatorOptions,
} from '../../creators/base';

@Injectable()
export class PreferencesLoaderCreator
  implements DataLoaderCreator<IPreference[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(
    options?: DataLoaderCreatorOptions<
      IPreference[],
      { id: string; preferenceSet?: PreferenceSet }
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
        preferenceSet: {
          preferences: true,
        },
      },
      this.constructor.name,
      options
    );
  }
}
