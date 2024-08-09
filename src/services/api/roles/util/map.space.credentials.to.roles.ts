import { EntityManager } from 'typeorm';
import { ICredential } from '@src/domain';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { groupCredentialsByEntity } from './group.credentials.by.entity';
import { getSpaceRolesForContributorEntityData } from './get.space.roles.for.contributor.entity.data';
import { getSpaceRolesForContributorQueryResult } from './get.space.roles.for.contributor.query.result';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';

export const mapSpaceCredentialsToRoles = async (
  entityManager: EntityManager,
  credentials: ICredential[],
  allowedVisibilities: SpaceVisibility[],
  agentInfo: AgentInfo,
  authorizationService: AuthorizationService
) => {
  const credentialMap = groupCredentialsByEntity(credentials);

  const spaceIds = Array.from(credentialMap.get('spaces')?.keys() ?? []);

  const { spaces, subspaces } = await getSpaceRolesForContributorEntityData(
    entityManager,
    spaceIds, // TODO: this used to merge in the account IDs for some reason, WHY?
    allowedVisibilities
  );

  return getSpaceRolesForContributorQueryResult(
    credentialMap,
    spaces,
    subspaces,
    agentInfo,
    authorizationService
  );
};
