import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { ICommunity } from '@domain/community/community';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { findByBatchIds } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class JourneyCommunityLoaderCreator
  implements DataLoaderCreator<ICommunity>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ICommunity>) {
    return new DataLoader<string, ICommunity>(
      async keys =>
        findByBatchIds<BaseChallenge, ICommunity>(
          // using BaseChallenge throws "No metadata for \"BaseChallenge\" was found."
          { manager: this.manager, classRef: Challenge },
          keys as string[],
          'community',
          options
        ),
      {
        cache: options?.cache,
        name: 'JourneyCommunityLoaderCreator',
      }
    );
  }
}
