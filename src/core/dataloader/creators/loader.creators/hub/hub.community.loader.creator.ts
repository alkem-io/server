import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ICommunity } from '@domain/community/community';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class HubCommunityLoaderCreator
  implements DataLoaderCreator<ICommunity>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ICommunity>) {
    return new DataLoader<string, ICommunity>(
      async keys =>
        findByBatchIds<Hub, ICommunity>(
          { manager: this.manager, classRef: Hub },
          keys as string[],
          'community',
          options
        ),
      {
        cache: options?.cache,
        name: 'HubCommunityLoaderCreator',
      }
    );
  }
}
