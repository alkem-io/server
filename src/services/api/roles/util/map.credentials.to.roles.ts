import { EntityManager } from 'typeorm';
import { ICredential } from '@src/domain';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { groupCredentialsByEntity } from './group.credentials.by.entity';
import { getUserRolesEntityData } from './get.user.roles.entity.data';
import { getUserRolesQueryResult } from './get.user.roles.query.result';

export const mapCredentialsToRoles = async (
  entityManager: EntityManager,
  credentials: ICredential[],
  allowedVisibilities: SpaceVisibility[]
) => {
  const credentialMap = groupCredentialsByEntity(credentials);

  const spaceIds = Array.from(credentialMap.get('spaces')?.keys() ?? []);
  const challengeIds = Array.from(
    credentialMap.get('challenges')?.keys() ?? []
  );
  const oppIds = Array.from(credentialMap.get('opportunities')?.keys() ?? []);
  const orgIds = Array.from(credentialMap.get('organizations')?.keys() ?? []);

  const { spaces, challenges, opportunities, organizations } =
    await getUserRolesEntityData(
      entityManager,
      spaceIds,
      allowedVisibilities,
      challengeIds,
      oppIds,
      orgIds
    );

  return getUserRolesQueryResult(
    credentialMap,
    spaces,
    challenges,
    opportunities,
    organizations
  );
};
