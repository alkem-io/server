import { SpaceVisibility } from '@common/enums/space.visibility';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ICredential } from '@src/domain/agent/credential';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { getSpaceRolesForContributorEntityData } from './get.space.roles.for.contributor.entity.data';
import { getSpaceRolesForContributorQueryResult } from './get.space.roles.for.contributor.query.result';
import { groupCredentialsByEntity } from './group.credentials.by.entity';

export const mapSpaceCredentialsToRoles = async (
  db: DrizzleDb,
  credentials: ICredential[],
  allowedVisibilities: SpaceVisibility[],
  agentInfo: AgentInfo,
  authorizationService: AuthorizationService
) => {
  const credentialMap = groupCredentialsByEntity(credentials);

  const spaceIds = Array.from(credentialMap.get('spaces')?.keys() ?? []);

  const { spaces, subspaces } = await getSpaceRolesForContributorEntityData(
    db,
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
