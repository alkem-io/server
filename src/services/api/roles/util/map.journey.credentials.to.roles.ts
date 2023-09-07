import { EntityManager } from 'typeorm';
import { ICredential } from '@src/domain';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { groupCredentialsByEntity } from './group.credentials.by.entity';
import { getJourneyRolesForContributorEntityData } from './get.journey.roles.for.contributor.entity.data';
import { getJourneyRolesForContributorQueryResult } from './get.journey.roles.for.contributor.query.result';

export const mapJourneyCredentialsToRoles = async (
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

  const { spaces, challenges, opportunities } =
    await getJourneyRolesForContributorEntityData(
      entityManager,
      spaceIds,
      allowedVisibilities,
      challengeIds,
      oppIds
    );

  return getJourneyRolesForContributorQueryResult(
    credentialMap,
    spaces,
    challenges,
    opportunities
  );
};
