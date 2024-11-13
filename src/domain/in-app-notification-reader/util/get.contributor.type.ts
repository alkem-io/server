import { IContributor } from '@domain/community/contributor/contributor.interface';
import { User } from '@domain/community/user/user.entity';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { Organization } from '@domain/community/organization';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';

export const getContributorType = (contributor: IContributor) => {
  if (contributor instanceof User) {
    return CommunityContributorType.USER;
  }
  if (contributor instanceof Organization) {
    return CommunityContributorType.ORGANIZATION;
  }
  if (contributor instanceof VirtualContributor) {
    return CommunityContributorType.VIRTUAL;
  }

  return undefined;
};
