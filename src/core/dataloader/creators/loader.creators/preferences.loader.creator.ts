import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IPreference } from '@domain/common/preference';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Organization } from '@src/domain';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { createTypedDataLoaderNew } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class PreferencesLoaderCreator
  implements DataLoaderCreator<IPreference[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(
    options?: DataLoaderCreatorOptions<
      IPreference[],
      Challenge | Hub | Organization
    >
  ) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        'This data loader requires the "parentClassRef" to be provided.'
      );
    }

    return createTypedDataLoaderNew(
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
