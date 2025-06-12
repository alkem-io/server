import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Account } from '@domain/space/account/account.entity';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';
import { ISpace } from '@domain/space/space/space.interface';

@Injectable()
export class AccountSpacesLoaderCreator implements DataLoaderCreator<ISpace[]> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<ISpace[]>) {
    return createTypedRelationDataLoader(
      this.manager,
      Account,
      { spaces: true },
      this.constructor.name,
      options
    );
  }
}
