import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Account } from '@domain/space/account/account.entity';
import { ITemplatesSet } from '@domain/template/templates-set';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class AccountLibraryLoaderCreator
  implements DataLoaderCreator<ITemplatesSet[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ITemplatesSet[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Account,
      { library: true },
      this.constructor.name,
      options
    );
  }
}
