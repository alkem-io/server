import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { IPreference } from '@domain/common/preference';
import { createTypedDataLoaderNew, findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { DataLoaderInitError } from '@common/exceptions/data-loader';

@Injectable()
export class JourneyPreferencesLoaderCreator
  implements DataLoaderCreator<IPreference[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IPreference[]>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        'This data loader requires the "parentClassRef" to be provided.'
      );
    }

    return createTypedDataLoaderNew(
      this.manager,
      options.parentClassRef,
      { preferences: true },
      this.constructor.name,
      options
    );
  }
}
