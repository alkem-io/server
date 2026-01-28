import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { Account } from '@domain/space/account/account.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

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
