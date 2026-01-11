import { userData } from '@test/data/user.mock';
import { organizationData } from '@test/data/organization.mock';
import { actorContextData } from '@test/data/actorContext.mock';
import { virtualContributorData } from '@test/data/virtual-contributor.mock';
import { spaceData } from '@test/data/space.mock';
import { applicationsData } from '@test/data/applications.mock';
import { rolesUserData } from '@test/data/roles-user.mock';

export const testData = {
  ...spaceData,
  ...organizationData,
  ...userData,
  ...applicationsData,
  ...rolesUserData,
  ...actorContextData,
  ...virtualContributorData,
};
