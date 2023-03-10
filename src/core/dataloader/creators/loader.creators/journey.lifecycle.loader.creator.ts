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
import { ILifecycle } from '@domain/common/lifecycle';

@Injectable()
export class JourneyLifecycleLoaderCreator
  implements DataLoaderCreator<ILifecycle>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ILifecycle>) {
    return new DataLoader<string, ILifecycle>(
      async keys =>
        findByBatchIds<BaseChallenge, ILifecycle>(
          // using BaseChallenge throws "No metadata for \"BaseChallenge\" was found."
          { manager: this.manager, classRef: Challenge },
          keys as string[],
          'lifecycle',
          options
        ),
      {
        cache: options?.cache,
        name: 'JourneyLifecycleLoaderCreator',
      }
    );
  }
}
