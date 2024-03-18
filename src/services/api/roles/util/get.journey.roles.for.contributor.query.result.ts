import { Space } from '@domain/challenge/space/space.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/challenge/opportunity';
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
      const accountID = space.account?.id;
      if (!accountID) {
        throw new RelationshipNotFoundException(
          `Unable to load account on Space in roles user: ${space.nameID}`,
          LogContext.ROLES
        );
      }
      const challengeResults: RolesResultCommunity[] = [];
      for (const challenge of challenges) {
        const challengeAccountID = challenge.account?.id;
        if (!challengeAccountID) {
          throw new RelationshipNotFoundException(
            `Unable to load account on Challenge in roles user: ${space.nameID}`,
            LogContext.ROLES
          );
        }
        if (challengeAccountID === accountID) {
          const challengeResult = new RolesResultCommunity(
            challenge.nameID,
            challenge.id,
            challenge.profile.displayName
          );
          challengeResult.userGroups = [];
          challengeResult.roles =
            map.get('challenges')?.get(challenge.id) ?? [];
          challengeResults.push(challengeResult);
        }
        spaceResult.challenges = challengeResults;
      }

      // TODO: also filter out opportunities in private challenges, for later...
      const opportunityResults: RolesResultCommunity[] = [];
      for (const opportunity of opportunities) {
        const opportunityAccountID = opportunity.account?.id;
        if (!opportunityAccountID) {
          throw new RelationshipNotFoundException(
            `Unable to load account on Opportunity in roles user: ${space.nameID}`,
            LogContext.ROLES
          );
        }
        if (opportunityAccountID === accountID) {
          const opportunityResult = new RolesResultCommunity(
            opportunity.nameID,
            opportunity.id,
            opportunity.profile.displayName
          );
          opportunityResult.userGroups = [];
          opportunityResult.roles =
            map.get('opportunities')?.get(opportunity.id) ?? [];
          opportunityResults.push(opportunityResult);
        }
        spaceResult.opportunities = opportunityResults;
      }
    }
    return spaceResult;
  });
};
