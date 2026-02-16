import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { Community } from '@domain/community/community/community.entity';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import { createTypedRelationDataLoader } from '../../../utils';
import { DataLoaderCreator, DataLoaderCreatorOptions } from '../../base';

@Injectable()
export class CommunityRoleSetLoaderCreator
  implements DataLoaderCreator<IRoleSet>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options: DataLoaderCreatorOptions<IRoleSet>) {
    return createTypedRelationDataLoader(
      this.manager,
      Community,
      { roleSet: { roles: true } },
      this.constructor.name,
      options
    );
  }
}
