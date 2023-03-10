import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { ICommunity } from '@domain/community/community';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { findByBatchIds } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { IAgent } from '@src/domain';

@Injectable()
export class JourneyAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IAgent>) {
    return new DataLoader<string, IAgent>(
      async keys =>
        findByBatchIds<BaseChallenge, IAgent>(
          // using BaseChallenge throws "No metadata for \"BaseChallenge\" was found."
          { manager: this.manager, classRef: Challenge },
          keys as string[],
          'agent',
          options
        ),
      {
        cache: options?.cache,
        name: 'JourneyAgentLoaderCreator',
      }
    );
  }
}
