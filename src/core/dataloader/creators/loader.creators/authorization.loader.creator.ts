import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { hasActorRelation } from './utils/has.actor.relation';

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

    // Actor-based entities (User, Organization, VirtualContributor, Account, Space)
    // have `authorization` as a getter delegating to actor.authorization,
    // not a TypeORM relation. We must join through actor and extract the result.
    if (hasActorRelation(this.manager, options.parentClassRef)) {
      return createTypedRelationDataLoader<any, IAuthorizationPolicy>(
        this.manager,
        options.parentClassRef,
        { actor: { authorization: true } },
        this.constructor.name,
        {
          ...options,
          getResult: (parent: any) => parent.actor?.authorization,
        }
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
