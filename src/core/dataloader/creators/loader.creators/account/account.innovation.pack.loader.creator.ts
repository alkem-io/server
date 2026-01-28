import { Account } from '@domain/space/account/account.entity';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class AccountInnovationPacksLoaderCreator
  implements DataLoaderCreator<IInnovationPack[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<IInnovationPack[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Account,
      { innovationPacks: true },
      this.constructor.name,
      options
    );
  }
}
