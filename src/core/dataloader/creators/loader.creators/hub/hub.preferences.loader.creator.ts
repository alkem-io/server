import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { IPreference } from '@domain/common/preference';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class HubPreferencesLoaderCreator
  implements DataLoaderCreator<IPreference[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IPreference[]>) {
    return new DataLoader<string, IPreference[]>(
      async keys =>
        findByBatchIds<BaseChallenge, IPreference[]>(
          { manager: this.manager, classRef: Hub },
          keys as string[],
          'agent',
          options
        ),
      {
        cache: options?.cache,
        name: 'HubPreferencesLoaderCreator',
      }
    );
  }
}
