import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import {
  DataLoaderCreator,
  DataLoaderCreatorBaseOptions,
} from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';

@Injectable()
export class CommunityTypeLoaderCreator
  implements DataLoaderCreator<{ id: string; type: RoleSetContributorType }>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create(options?: DataLoaderCreatorBaseOptions<any, any>) {
    return createBatchLoader(this.communityTypeInBatch, {
      name: this.constructor.name,
      loadedTypeName: 'CommunityContributorType',
      resolveToNull: options?.resolveToNull,
    });
  }

  private async communityTypeInBatch(
    keys: ReadonlyArray<string>
  ): Promise<{ id: string; type: RoleSetContributorType }[]> {
    const result = await this.manager
      .createQueryBuilder()
      .select('user.id')
      .from(User, 'user')
      .addSelect('organization.id')
      .addFrom(Organization, 'organization')
      .addSelect('vc.id')
      .addFrom(VirtualContributor, 'vc')
      .where('user.id IN (:...ids)', { ids: keys })
      .orWhere('organization.id IN (:...ids)', { ids: keys })
      .orWhere('vc.id IN (:...ids)', { ids: keys })
      .getRawMany<User | Organization | VirtualContributor>();

    return result.map(item => {
      if (item instanceof User) {
        return { id: item.id, type: RoleSetContributorType.USER };
      }
      if (item instanceof Organization) {
        return { id: item.id, type: RoleSetContributorType.ORGANIZATION };
      }
      return { id: item.id, type: RoleSetContributorType.VIRTUAL };
    });
  }
}
