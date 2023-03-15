import DataLoader from 'dataloader';
import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { ICommunity } from '@domain/community/community';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { createTypedDataLoaderNew, findByBatchIds } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { Hub } from '@domain/challenge/hub/hub.entity';
import { DataLoaderInitError } from '@common/exceptions/data-loader';

@Injectable()
export class JourneyCommunityLoaderCreator
  implements DataLoaderCreator<ICommunity>
{
  constructor(
    @InjectEntityManager() private manager: EntityManager,
    @InjectRepository(BaseChallenge) private repo: Repository<BaseChallenge>
  ) {}

  create(options?: DataLoaderCreatorOptions<ICommunity>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        'This data loader requires the "parentClassRef" to be provided.'
      );
    }

    return createTypedDataLoaderNew(
      this.manager,
      options.parentClassRef,
      { community: true },
      this.constructor.name,
      options
    );
  }
}
