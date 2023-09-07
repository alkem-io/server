import { EntityManager } from 'typeorm';
import { ICredential } from '@src/domain';
import { groupCredentialsByEntity } from './group.credentials.by.entity';
import { getOrganizationRolesForUserEntityData } from './get.organization.roles.for.user.entity.data';
import { getOrganizationRolesForUserQueryResult } from './get.organization.roles.for.user.query.result';

export const mapOrganizationCredentialsToRoles = async (
  entityManager: EntityManager,
  credentials: ICredential[]
) => {
  const credentialMap = groupCredentialsByEntity(credentials);

  const orgIds = Array.from(credentialMap.get('organizations')?.keys() ?? []);

  const organizations = await getOrganizationRolesForUserEntityData(
    entityManager,
    orgIds
  );

  return getOrganizationRolesForUserQueryResult(credentialMap, organizations);
};
