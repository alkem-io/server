import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Account } from '@domain/space/account/account.entity';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { IVirtualContributor } from '@domain/community/virtual-contributor';

@Injectable()
export class AccountVirtualContributorsLoaderCreator
  implements DataLoaderCreator<IVirtualContributor[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IVirtualContributor[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Account,
      { virtualContributors: true },
      this.constructor.name,
      options
    );
  }
}
