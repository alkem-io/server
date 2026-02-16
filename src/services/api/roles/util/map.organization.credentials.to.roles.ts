import { ICredential } from '@src/domain/agent/credential';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { getOrganizationRolesForUserEntityData } from './get.organization.roles.for.user.entity.data';
import { getOrganizationRolesForUserQueryResult } from './get.organization.roles.for.user.query.result';
import { groupCredentialsByEntity } from './group.credentials.by.entity';

export const mapOrganizationCredentialsToRoles = async (
  db: DrizzleDb,
  credentials: ICredential[]
) => {
  const credentialMap = groupCredentialsByEntity(credentials);

  const orgIds = Array.from(credentialMap.get('organizations')?.keys() ?? []);

  const organizations = await getOrganizationRolesForUserEntityData(
    db,
    orgIds
  );

  return getOrganizationRolesForUserQueryResult(credentialMap, organizations);
};
