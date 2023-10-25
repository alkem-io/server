import { Space } from '@domain/challenge/space/space.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity';
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
  challenges: Challenge[],
  opportunities: Opportunity[],
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
      spaceResult.challenges = challenges
        .filter(challenge => challenge.spaceID === space.id)
        .map(x => {
          const challengeResult = new RolesResultCommunity(
            x.nameID,
            x.id,
            x.profile.displayName
          );
          challengeResult.userGroups = [];
          challengeResult.roles = map.get('challenges')?.get(x.id) ?? [];
          return challengeResult;
        });

      // TODO: also filter out opportunities in private challenges, for later...
      spaceResult.opportunities = opportunities
        .filter(opp => opp.spaceID === space.id)
        .map(x => {
          const oppResult = new RolesResultCommunity(
            x.nameID,
            x.id,
            x.profile.displayName
          );
          oppResult.userGroups = [];
          oppResult.roles = map.get('opportunities')?.get(x.id) ?? [];
          return oppResult;
        });
    }
    return spaceResult;
  });
};
