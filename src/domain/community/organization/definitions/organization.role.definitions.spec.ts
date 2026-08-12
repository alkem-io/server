import { RoleName } from '@common/enums/role.name';
import { organizationRoleDefinitions } from './organization.role.definitions';

describe('organizationRoleDefinitions', () => {
  const getRole = (name: RoleName) => {
    const role = organizationRoleDefinitions.find(r => r.name === name);
    if (!role) {
      throw new Error(`Role definition not found: ${name}`);
    }
    return role;
  };

  // Regression for alkem-io/client-web#10132 (AC1): the organization admin
  // limit was raised from 3 to 6. The cap is enforced in RoleSetService via
  // userPolicyData.maximum for the ADMIN role.
  it('allows up to 6 organization admins', () => {
    expect(getRole(RoleName.ADMIN).userPolicyData.maximum).toBe(6);
  });

  it('keeps the organization owner limit at 3 (unchanged by #10132)', () => {
    expect(getRole(RoleName.OWNER).userPolicyData.maximum).toBe(3);
  });
});
