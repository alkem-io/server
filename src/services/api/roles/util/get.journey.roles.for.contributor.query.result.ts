import { Space } from '@domain/space/space/space.entity';
import { RolesResultSpace } from '../dto/roles.dto.result.space';
import { RolesResultCommunity } from '../dto/roles.dto.result.community';
import { CredentialMap } from './group.credentials.by.entity';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPrivilege, LogContext } from '@common/enums';

export const getJourneyRolesForContributorQueryResult = (
  map: CredentialMap,
  spaces: Space[],
  subspaces: Space[],
  subsubspaces: Space[],
  agentInfo: AgentInfo,
  authorizationService: AuthorizationService
): RolesResultSpace[] => {
  return spaces.map(space => {
    const spaceResult = new RolesResultSpace(space);

    spaceResult.userGroups = [];
    spaceResult.roles = map.get('spaces')?.get(space.id) ?? [];

    // Only return children of spaces that the current user has READ access to
    if (!space.authorization) {
      throw new RelationshipNotFoundException(
        `Unable to load authorization on Space in roles user: ${space.nameID}`,
        LogContext.ROLES
      );
    }
    const readAccessSpace = authorizationService.isAccessGranted(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.READ
    );

    if (readAccessSpace) {
      const accountID = space.account?.id;
      if (!accountID) {
        throw new RelationshipNotFoundException(
          `Unable to load account on Space in roles user: ${space.nameID}`,
          LogContext.ROLES
        );
      }
      const challengeResults: RolesResultCommunity[] = [];
      for (const subspace of subspaces) {
        const challengeAccountID = subspace.account?.id;
        if (!challengeAccountID) {
          throw new RelationshipNotFoundException(
            `Unable to load account on Challenge in roles user: ${space.nameID}`,
            LogContext.ROLES
          );
        }
        if (challengeAccountID === accountID) {
          const challengeResult = new RolesResultCommunity(
            subspace.nameID,
            subspace.id,
            subspace.profile.displayName
          );
          challengeResult.userGroups = [];
          challengeResult.roles = map.get('subspaces')?.get(subspace.id) ?? [];
          challengeResults.push(challengeResult);
        }
        spaceResult.subspaces = challengeResults;
      }

      // TODO: also filter out subsubspaces in private subspaces, for later...
      const opportunityResults: RolesResultCommunity[] = [];
      for (const subsubspace of subsubspaces) {
        const opportunityAccountID = subsubspace.account?.id;
        if (!opportunityAccountID) {
          throw new RelationshipNotFoundException(
            `Unable to load account on Opportunity in roles user: ${space.nameID}`,
            LogContext.ROLES
          );
        }
        if (opportunityAccountID === accountID) {
          const opportunityResult = new RolesResultCommunity(
            subsubspace.nameID,
            subsubspace.id,
            subsubspace.profile.displayName
          );
          opportunityResult.userGroups = [];
          opportunityResult.roles =
            map.get('subspaces')?.get(subsubspace.id) ?? [];
          opportunityResults.push(opportunityResult);
        }
        spaceResult.subsubspaces = opportunityResults;
      }
    }
    return spaceResult;
  });
};
