import * as user from '@test/data/user.json';
import * as agent from '@test/data/agent.json';
import * as organization from '@test/data/organization.json';
import * as space from '@test/data/space.json';
import * as subspace from '@test/data/subspace.json';
import * as subsubspace from '@test/data/subsubspace.json';
import * as applications from '@test/data/applications.json';
import * as userRoles from '@test/data/roles-user.json';
import * as agentInfo from '@test/data/agentInfo.json';

export const testData = {
  ...space,
  ...subspace,
  ...subsubspace,
  ...agent,
  ...organization,
  ...user,
  ...applications,
  ...userRoles,
  ...agentInfo,
};
