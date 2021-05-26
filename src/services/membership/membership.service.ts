import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Membership } from './membership.dto.result';
import { UserService } from '@domain/community/user/user.service';
import { MembershipInput } from './membership.dto.input';
import { MembershipEcoverseResultEntry } from './membership.dto.result.ecoverse.entry';

import { CommunityService } from '@domain/community/community/community.service';
import { Community } from '@domain/community/community';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { Challenge, IChallenge } from '@domain/challenge/challenge';
import { IUserGroup } from '@domain/community/user-group';
import { MembershipResultEntry } from './membership.dto.result.entry';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IOpportunity } from '@domain/collaboration/opportunity';

export class MembershipService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private communityService: CommunityService,
    private ecoverseService: EcoverseService,
    private challengeService: ChallengeService,
    private organisationService: OrganisationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async membership(membershipData: MembershipInput): Promise<Membership> {
    const membership = new Membership();
    const user = await this.userService.getUserWithAgent(membershipData.userID);
    const credentials = user.agent?.credentials;
    if (!credentials) {
      return membership;
    }
    const storedChallenges: IChallenge[] = [];
    const storedOpportunities: IOpportunity[] = [];
    const storedUserGroups: IUserGroup[] = [];
    for (const credential of credentials) {
      if (credential.type === AuthorizationCredential.OrganisationMember) {
        const organisation = await this.organisationService.getOrganisationOrFail(
          credential.resourceID
        );
        const orgResult = new MembershipResultEntry(
          organisation.displayName,
          `organisation:${organisation.id}`,
          organisation.displayName
        );
        membership.organisations.push(orgResult);
      } else if (credential.type === AuthorizationCredential.CommunityMember) {
        const community = await this.communityService.getCommunityOrFail(
          credential.resourceID,
          {
            relations: ['challenge', 'opportunity'],
          }
        );
        const challenge = (community as Community).challenge;
        const opportunity = (community as Community).opportunity;
        if (challenge) {
          // Need to see if in ecoverse, or a Challenge
          const challengeWithFields = await this.challengeService.getChallengeOrFail(
            challenge?.id,
            {
              relations: ['ecoverse'],
            }
          );
          const ecoverse = (challengeWithFields as Challenge).ecoverse;
          if (ecoverse) {
            const ecoverseResult = await this.createEcoverseMembershipResult(
              ecoverse.id
            );
            membership.ecoverses.push(ecoverseResult);
          } else {
            storedChallenges.push(challenge);
          }
        } else if (opportunity) {
          storedOpportunities.push(opportunity);
        } else {
          throw new EntityNotInitializedException(
            `Unable to identify community parent: ${community.displayName}`,
            LogContext.COMMUNITY
          );
        }
      } else if (credential.type === AuthorizationCredential.UserGroupMember) {
        const group = await this.userGroupService.getUserGroupOrFail(
          credential.resourceID
        );
        storedUserGroups.push(group);
      }
    }

    // Assume single ecoverse for now.
    // Todo: when domain-model restructuring goes in use the ecoverseID to determine ecoverse scope.
    if (membership.ecoverses.length > 0) {
      const ecoverseResult = membership.ecoverses[0];
      for (const challenge of storedChallenges) {
        const challengeResult = new MembershipResultEntry(
          challenge.nameID,
          `challenge:${challenge.id}`,
          challenge.displayName
        );
        ecoverseResult.challenges.push(challengeResult);
      }
      for (const opportunity of storedOpportunities) {
        const opportunityResult = new MembershipResultEntry(
          opportunity.nameID,
          `opportunity:${opportunity.id}`,
          opportunity.displayName
        );
        ecoverseResult.opportunities.push(opportunityResult);
      }
      for (const group of storedUserGroups) {
        const groupResult = new MembershipResultEntry(
          group.name,
          `group:${group.id}`,
          group.name
        );
        ecoverseResult.userGroups.push(groupResult);
      }
    }

    return membership;
  }

  async createEcoverseMembershipResult(
    ecoverseID: string
  ): Promise<MembershipEcoverseResultEntry> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(ecoverseID);
    const ecoverseResult = new MembershipEcoverseResultEntry();
    ecoverseResult.name = ecoverse.nameID;
    ecoverseResult.id = `ecoverse:${ecoverse.nameID}`;
    return ecoverseResult;
  }
}
