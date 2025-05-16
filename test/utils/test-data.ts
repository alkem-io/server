import { userData } from '@test/data/user.mock';
import { organizationData } from '@test/data/organization.mock';
import { agentInfoData } from '@test/data/agentInfo.mock';
import { virtualContributorData } from '@test/data/virtual-contributor.mock';
import { agentData } from '@test/data/agent.mock';
import { spaceData } from '@test/data/space.mock';
import { applicationsData } from '@test/data/applications.mock';
import { rolesUserData } from '@test/data/roles-user.mock';

export const testData = {
  ...spaceData,
  ...agentData,
  ...organizationData,
  ...userData,
  ...applicationsData,
  ...rolesUserData,
  ...agentInfoData,
  ...virtualContributorData,
};
