import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ICollaboration } from '@domain/collaboration/collaboration';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class HubCollaborationLoaderCreator
  implements DataLoaderCreator<ICollaboration>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ICollaboration>) {
    return new DataLoader<string, ICollaboration>(
      async keys =>
        findByBatchIds<Hub, ICollaboration>(
          { manager: this.manager, classRef: Hub },
          keys as string[],
          'collaboration',
          options
        ),
      {
        cache: options?.cache,
        name: 'HubCollaborationLoaderCreator',
      }
    );
  }
}
