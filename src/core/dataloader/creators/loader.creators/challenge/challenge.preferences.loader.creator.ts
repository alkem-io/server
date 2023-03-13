import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { IPreference } from '@domain/common/preference';
import { findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class ChallengePreferencesLoaderCreator
  implements DataLoaderCreator<IPreference[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IPreference[]>) {
    return new DataLoader<string, IPreference[]>(
      async keys =>
        findByBatchIds<BaseChallenge, IPreference[]>(
          { manager: this.manager, classRef: Challenge },
          keys as string[],
          'agent',
          options
        ),
      {
        cache: options?.cache,
        name: 'ChallengePreferencesLoaderCreator',
      }
    );
  }
}
