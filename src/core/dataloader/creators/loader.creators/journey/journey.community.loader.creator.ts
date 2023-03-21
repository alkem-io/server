import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { BaseChallenge } from '@domain/challenge/base-challenge/base.challenge.entity';
import { ICommunity } from '@domain/community/community';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

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
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedRelationDataLoader(
      this.manager,
      options.parentClassRef,
      { community: true },
      this.constructor.name,
      options
    );
  }
}
