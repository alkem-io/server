import DataLoader from 'dataloader';
import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { ICommunity } from '@domain/community/community';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { Hub } from '@domain/challenge/hub/hub.entity';

@Injectable()
export class ChallengeCommunityLoaderCreator
  implements DataLoaderCreator<ICommunity>
{
  constructor(
    @InjectEntityManager() private manager: EntityManager,
    @InjectRepository(BaseChallenge) private repo: Repository<BaseChallenge>
  ) {}

  create(options?: DataLoaderCreatorOptions<ICommunity>) {
    return new DataLoader<string, ICommunity>(
      async keys =>
        findByBatchIds<BaseChallenge, ICommunity>(
          // using BaseChallenge throws "No metadata for \"BaseChallenge\" was found."
          //{ manager: this.manager, classRef: BaseChallenge },
          this.repo,
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
