import * as space from '@test/data/space.json';
import * as user from '@test/data/user.json';
import * as agent from '@test/data/agent.json';
import * as organization from '@test/data/organization.json';
import * as opportunity from '@test/data/opportunity.json';
import * as applications from '@test/data/applications.json';
import * as userRoles from '@test/data/roles-user.json';
import * as challenge from '@test/data/challenge.json';

export const testData = {
  ...space,
  ...agent,
  ...opportunity,
  ...organization,
  ...user,
  ...applications,
  ...userRoles,
  ...challenge,
};
