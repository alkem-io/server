import { Space } from '@domain/challenge/space/space.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity';
import { RolesResultSpace } from '../dto/roles.dto.result.space';
import { RolesResultCommunity } from '../dto/roles.dto.result.community';
import { CredentialMap } from './group.credentials.by.entity';

export const getJourneyRolesForContributorQueryResult = (
  map: CredentialMap,
  spaces: Space[],
  challenges: Challenge[],
  opportunities: Opportunity[]
) => {
  return {
    spaces: spaces.map(space => {
      const spaceResult = new RolesResultSpace(space);

      spaceResult.userGroups = [];
      spaceResult.roles = map.get('spaces')?.get(space.id) ?? [];

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
      return spaceResult;
    }),
  };
};
