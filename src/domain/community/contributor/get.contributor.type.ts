import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { Organization } from '../organization/organization.entity';
import { User } from '../user/user.entity';
import { VirtualContributor } from '../virtual-contributor/virtual.contributor.entity';
import { IContributor } from './contributor.interface';

export const getContributorType = (
  contributor: IContributor
): RoleSetContributorType => {
  if (contributor instanceof User) {
    return RoleSetContributorType.USER;
  }
  if (contributor instanceof Organization) {
    return RoleSetContributorType.ORGANIZATION;
  }
  if (contributor instanceof VirtualContributor) {
    return RoleSetContributorType.VIRTUAL;
  }

  throw new Error(`Unable to determine contributor type for ${contributor.id}`);
};
