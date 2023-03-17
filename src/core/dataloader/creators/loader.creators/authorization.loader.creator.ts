import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';

@Injectable()
export class AuthorizationLoaderCreator
  implements DataLoaderCreator<IAuthorizationPolicy>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(
    options?: DataLoaderCreatorOptions<IAuthorizationPolicy, AuthorizableEntity>
  ) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedRelationDataLoader(
      this.manager,
      options.parentClassRef,
      { authorization: true },
      this.constructor.name,
      options
    );
  }
}
