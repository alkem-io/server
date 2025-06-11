import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Account } from '@domain/space/account/account.entity';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';

@Injectable()
export class AccountInnovationHubsLoaderCreator
  implements DataLoaderCreator<IInnovationHub[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<IInnovationHub[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Account,
      { innovationHubs: true },
      this.constructor.name,
      options
    );
  }
}
