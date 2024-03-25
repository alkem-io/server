import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Account } from '@domain/challenge/account/account.entity';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { ILicense } from '@domain/license/license/license.interface';

@Injectable()
export class AccountLicenseLoaderCreator
  implements DataLoaderCreator<ILicense[]>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<ILicense[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Account,
      { license: { featureFlags: true } },
      this.constructor.name,
      options
    );
  }
}
