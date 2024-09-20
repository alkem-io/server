import { Space } from '@domain/space/space/space.entity';
import { RolesResultSpace } from '../dto/roles.dto.result.space';
import { RolesResultCommunity } from '../dto/roles.dto.result.community';
import { CredentialMap } from './group.credentials.by.entity';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';

export const getSpaceRolesForContributorQueryResult = (
  map: CredentialMap,
  spaces: Space[],
  subspaces: Space[],
  agentInfo: AgentInfo,
  authorizationService: AuthorizationService
): RolesResultSpace[] => {
  const spacesCredentialsMap = map.get('spaces');
  return spaces.map(space => {
    const spaceResult = new RolesResultSpace(space);

    spaceResult.roles = spacesCredentialsMap?.get(space.id) ?? [];

    // Only return children of spaces that the current user has READ access to
    if (!space.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load authorization on Space in roles user: ${space.id}`,
        LogContext.ROLES
      );
    }
    const readAccessSpace = authorizationService.isAccessGranted(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.READ
    );

    if (readAccessSpace) {
      const levelZeroSpaceID = space.levelZeroSpaceID;
      const subspaceResults: RolesResultCommunity[] = [];
      for (const subspace of subspaces) {
        const challengeLevelZeroSpaceID = subspace.levelZeroSpaceID;
        if (!challengeLevelZeroSpaceID) {
          throw new RelationshipNotFoundException(
            `Unable to load L0 space ID on Subspace in roles user: ${space.id}`,
            LogContext.ROLES
          );
        }
        if (challengeLevelZeroSpaceID === levelZeroSpaceID) {
          const subspaceResult = new RolesResultCommunity(
            subspace.nameID,
            subspace.id,
            subspace.profile.displayName,
            subspace.type,
            subspace.level
          );
          subspaceResult.roles = spacesCredentialsMap?.get(subspace.id) ?? [];
          subspaceResults.push(subspaceResult);
        }
        spaceResult.subspaces = subspaceResults;
      }
    }
    return spaceResult;
  });
};
