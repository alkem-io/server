import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Account } from '@domain/challenge/account/account.entity';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { ISpaceDefaults } from '@domain/challenge/space.defaults/space.defaults.interface';

@Injectable()
export class AccountDefaultsLoaderCreator
  implements DataLoaderCreator<ISpaceDefaults[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ISpaceDefaults[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Account,
      {
        defaults: {
          innovationFlowTemplate: {
            profile: true,
          },
        },
      },
      this.constructor.name,
      options
    );
  }
}
