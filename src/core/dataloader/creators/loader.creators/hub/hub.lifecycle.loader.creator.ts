import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { ILifecycle } from '@domain/common/lifecycle';
import { findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class HubLifecycleLoaderCreator
  implements DataLoaderCreator<ILifecycle>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ILifecycle>) {
    return new DataLoader<string, ILifecycle>(
      async keys =>
        findByBatchIds<BaseChallenge, ILifecycle>(
          { manager: this.manager, classRef: Hub },
          keys as string[],
          'lifecycle',
          options
        ),
      {
        cache: options?.cache,
        name: 'HubLifecycleLoaderCreator',
      }
    );
  }
}
