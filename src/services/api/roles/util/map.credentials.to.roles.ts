import { EntityManager } from 'typeorm';
import { ICredential } from '@src/domain';
import { HubVisibility } from '@common/enums/hub.visibility';
import { groupCredentialsByEntity } from './group.credentials.by.entity';
import { getUserRolesEntityData } from './get.user.roles.entity.data';
import { getUserRolesQueryResult } from './get.user.roles.query.result';

export const mapCredentialsToRoles = async (
  entityManager: EntityManager,
  credentials: ICredential[],
  allowedVisibilities: HubVisibility[]
) => {
  const credentialMap = groupCredentialsByEntity(credentials);

  const hubIds = Array.from(credentialMap.get('hubs')?.keys() ?? []);
  const challengeIds = Array.from(
    credentialMap.get('challenges')?.keys() ?? []
  );
  const oppIds = Array.from(credentialMap.get('opportunities')?.keys() ?? []);
  const orgIds = Array.from(credentialMap.get('organizations')?.keys() ?? []);

  const { hubs, challenges, opportunities, organizations } =
    await getUserRolesEntityData(
      entityManager,
      hubIds,
      allowedVisibilities,
      challengeIds,
      oppIds,
      orgIds
    );

  return getUserRolesQueryResult(
    credentialMap,
    hubs,
    challenges,
    opportunities,
    organizations
  );
};
