import { Organization } from '@src/domain/community/organization';
import { RolesResultOrganization } from '../dto/roles.dto.result.organization';
import { CredentialMap } from './group.credentials.by.entity';

export const getOrganizationRolesForUserQueryResult = (
  map: CredentialMap,
  organizations: Organization[]
): RolesResultOrganization[] => {
  return organizations.map(org => {
    const orgResult = new RolesResultOrganization(org, org.profile.displayName);
    orgResult.userGroups = [];
    orgResult.roles = map.get('organizations')?.get(org.id) ?? [];
    return orgResult;
  });
};
