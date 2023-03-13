import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { IContext } from '@src/domain';
import { findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { Hub } from '@domain/challenge/hub/hub.entity';

@Injectable()
export class HubContextLoaderCreator implements DataLoaderCreator<IContext> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IContext>) {
    return new DataLoader<string, IContext>(
      async keys =>
        findByBatchIds<BaseChallenge, IContext>(
          { manager: this.manager, classRef: Hub },
          keys as string[],
          'context',
          options
        ),
      {
        cache: options?.cache,
        name: 'HubContextLoaderCreator',
      }
    );
  }
}
