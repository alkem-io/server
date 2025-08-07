import { IContributor } from '@domain/community/contributor/contributor.interface';
import { User } from '@domain/community/user/user.entity';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { Organization } from '@domain/community/organization';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';

export const getContributorType = (contributor: IContributor) => {
  if (contributor instanceof User) {
    return RoleSetContributorType.USER;
  }
  if (contributor instanceof Organization) {
    return RoleSetContributorType.ORGANIZATION;
  }
  if (contributor instanceof VirtualContributor) {
    return RoleSetContributorType.VIRTUAL;
  }

  return undefined;
};
