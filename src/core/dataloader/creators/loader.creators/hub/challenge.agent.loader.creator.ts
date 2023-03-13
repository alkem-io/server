import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { IAgent } from '@src/domain';
import { findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class HubAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IAgent>) {
    return new DataLoader<string, IAgent>(
      async keys =>
        findByBatchIds<BaseChallenge, IAgent>(
          { manager: this.manager, classRef: Hub },
          keys as string[],
          'agent',
          options
        ),
      {
        cache: options?.cache,
        name: 'HubAgentLoaderCreator',
      }
    );
  }
}
