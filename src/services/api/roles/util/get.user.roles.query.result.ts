import { Hub } from '@domain/challenge/hub/hub.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/collaboration/opportunity';
import { Organization } from '@src/domain';
import { RolesResultHub } from '../dto/roles.dto.result.hub';
import { RolesResultCommunity } from '../dto/roles.dto.result.community';
import { RolesResultOrganization } from '../dto/roles.dto.result.organization';
import { CredentialMap } from './group.credentials.by.entity';

export const getUserRolesQueryResult = (
  map: CredentialMap,
  hubs: Hub[],
  challenges: Challenge[],
  opportunities: Opportunity[],
  organizations: Organization[]
) => {
  return {
    hubs: hubs.map(hub => {
      const hubResult = new RolesResultHub(hub);

      hubResult.userGroups = [];
      hubResult.roles = map.get('hubs')?.get(hub.id) ?? [];

      hubResult.challenges = challenges
        .filter(challenge => challenge.hubID === hub.id)
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

      hubResult.opportunities = opportunities
        .filter(opp => opp.hubID === hub.id)
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
      return hubResult;
    }),
    organizations: organizations.map(org => {
      const orgResult = new RolesResultOrganization(
        org,
        org.profile.displayName
      );
      orgResult.userGroups = [];
      orgResult.roles = map.get('organizations')?.get(org.id) ?? [];
      return orgResult;
    }),
  };
};
