import { EntityManager } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { DataLoaderCreator } from '@core/dataloader/creators/base';
import { createBatchLoader } from '@core/dataloader/utils';
import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';

@Injectable()
export class CommunityTypeLoaderCreator
  implements DataLoaderCreator<{ id: string; type: CommunityContributorType }>
{
  constructor(@InjectEntityManager() private manager: EntityManager) {}

  create() {
    return createBatchLoader(
      this.constructor.name,
      'CommunityContributorType',
      this.communityTypeInBatch
    );
  }

  private async communityTypeInBatch(
    keys: ReadonlyArray<string>
  ): Promise<{ id: string; type: CommunityContributorType }[]> {
    const result = await this.manager
      .createQueryBuilder()
      .select('user.id')
      .from(User, 'user')
      .addSelect('organization.id')
      .from(Organization, 'organization')
      .addSelect('vc.id')
      .from(VirtualContributor, 'vc')
      .where('user.id IN (:...ids)', { ids: keys })
      .orWhere('organization.id IN (:...ids)', { ids: keys })
      .orWhere('vc.id IN (:...ids)', { ids: keys })
      .getRawMany<User | Organization | VirtualContributor>();

    return result.map(item => {
      if (item instanceof User) {
        return { id: item.id, type: CommunityContributorType.USER };
      }
      if (item instanceof Organization) {
        return { id: item.id, type: CommunityContributorType.ORGANIZATION };
      }
      return { id: item.id, type: CommunityContributorType.VIRTUAL };
    });
  }
}
