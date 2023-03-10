import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Injectable } from '@nestjs/common';
import { IAgent, User } from '@src/domain';
import { findByBatchIds } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';

@Injectable()
export class UserAgentLoaderCreator implements DataLoaderCreator<IAgent> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IAgent>) {
    return new DataLoader<string, IAgent>(
      keys =>
        findByBatchIds<User, IAgent>(
          { manager: this.manager, classRef: User },
          keys as string[],
          'agent',
          options
        ),
      {
        cache: options?.cache,
        name: 'UserAgentLoaderCreator',
      }
    );
  }
}
