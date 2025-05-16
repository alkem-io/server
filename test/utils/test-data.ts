import * as space from '@test/data/space.json';
import * as subspace from '@test/data/subspace.json';
import * as subsubspace from '@test/data/subsubspace.json';
import * as applications from '@test/data/applications.json';
import * as userRoles from '@test/data/roles-user.json';
import { userData } from '@test/data/user.mock';
import { organizationData } from '@test/data/organization.mock';
import { agentInfoData } from '@test/data/agentInfo.mock';
import { virtualContributorData } from '@test/data/virtual-contributor.mock';
import { agentData } from '@test/data/agent.mock';

export const testData = {
  ...space,
  ...subspace,
  ...subsubspace,
  ...agentData,
  ...organizationData,
  ...userData,
  ...applications,
  ...userRoles,
  ...agentInfoData,
  ...virtualContributorData,
};
