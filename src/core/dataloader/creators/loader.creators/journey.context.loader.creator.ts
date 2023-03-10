import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { IContext } from '@src/domain';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { findByBatchIds } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class JourneyContextLoaderCreator
  implements DataLoaderCreator<IContext>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IContext>) {
    return new DataLoader<string, IContext>(
      async keys =>
        findByBatchIds<BaseChallenge, IContext>(
          // using BaseChallenge throws "No metadata for \"BaseChallenge\" was found."
          { manager: this.manager, classRef: Challenge },
          keys as string[],
          'context',
          options
        ),
      {
        cache: options?.cache,
        name: 'JourneyContextLoaderCreator',
      }
    );
  }
}
