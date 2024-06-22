import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { createTypedRelationDataLoader } from '@core/dataloader/utils';
import { IAccount } from '@domain/space/account/account.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class AccountLoaderCreator implements DataLoaderCreator<IAccount> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(
    options?: DataLoaderCreatorOptions<
      IAccount,
      { id: string; account?: IAccount }
    >
  ) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedRelationDataLoader(
      this.manager,
      options.parentClassRef,
      {
        account: true,
      },
      this.constructor.name,
      options
    );
  }
}
