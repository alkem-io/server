import { DataLoaderInitError } from '@common/exceptions/data-loader';
import { IProfile } from '@domain/common/profile';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../base';
import { hasActorRelation } from './utils/has.actor.relation';

type ProfileParent = { id: string; profile?: IProfile };

@Injectable()
export class ProfileLoaderCreator implements DataLoaderCreator<IProfile> {
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorOptions<IProfile, ProfileParent>) {
    if (!options?.parentClassRef) {
      throw new DataLoaderInitError(
        `${this.constructor.name} requires the 'parentClassRef' to be provided.`
      );
    }

    // Actor-based entities (User, Organization, VirtualContributor, etc.)
    // have `profile` as a getter delegating to actor.profile, not a TypeORM relation.
    // We must join through actor and extract the result.
    if (hasActorRelation(this.manager, options.parentClassRef)) {
      return createTypedRelationDataLoader<any, IProfile>(
        this.manager,
        options.parentClassRef,
        { actor: { profile: true } },
        this.constructor.name,
        {
          ...options,
          getResult: (parent: any) => parent.actor?.profile,
        }
      );
    }

    return createTypedRelationDataLoader(
      this.manager,
      options.parentClassRef,
      { profile: true },
      this.constructor.name,
      options
    );
  }
}
