import { Account } from '@domain/space/account/account.entity';
import { ISpace } from '@domain/space/space/space.interface';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

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
