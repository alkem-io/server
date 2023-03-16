import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { createTypedDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';

@Injectable()
export class AuthorizationLoaderCreator
  implements DataLoaderCreator<IAuthorizationPolicy>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IAuthorizable>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    return createTypedDataLoader(
      this.manager,
      options.parentClassRef,
      { authorization: true },
      this.constructor.name,
      options
    );
  }
}
