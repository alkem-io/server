import { EntityManager } from 'typeorm';
import { ICredential } from '@src/domain';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { groupCredentialsByEntity } from './group.credentials.by.entity';
import { getJourneyRolesForContributorEntityData } from './get.journey.roles.for.contributor.entity.data';
import { getJourneyRolesForContributorQueryResult } from './get.journey.roles.for.contributor.query.result';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';

export const mapJourneyCredentialsToRoles = async (
  entityManager: EntityManager,
  credentials: ICredential[],
  allowedVisibilities: SpaceVisibility[],
  agentInfo: AgentInfo,
  authorizationService: AuthorizationService
) => {
  const credentialMap = groupCredentialsByEntity(credentials);

  const spaceIds = Array.from(credentialMap.get('spaces')?.keys() ?? []);
  const accountIds = Array.from(credentialMap.get('accounts')?.keys() ?? []);

  const { spaces, subspaces } = await getJourneyRolesForContributorEntityData(
    entityManager,
    spaceIds.concat(accountIds), // For now merge accounts with spaces
    allowedVisibilities
  );

  return getJourneyRolesForContributorQueryResult(
    credentialMap,
    spaces,
    subspaces,
    agentInfo,
    authorizationService
  );
};
