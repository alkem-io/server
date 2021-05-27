import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Membership } from './membership.dto.result';
import { UserService } from '@domain/community/user/user.service';
import { MembershipInput } from './membership.dto.input';
import { MembershipResultEntryEcoverse } from './membership.dto.result.entry.ecoverse';

import { CommunityService } from '@domain/community/community/community.service';
import { Community, ICommunity } from '@domain/community/community';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { Challenge, IChallenge } from '@domain/challenge/challenge';
import { IUserGroup } from '@domain/community/user-group';
import { MembershipResultEntry } from './membership.dto.result.entry';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { EntityNotInitializedException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { IOrganisation } from '@domain/community';
import { MembershipResultEntryOrganisation } from './membership.dto.result.entry.organisation';

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
    const storedCommunityUserGroups: IUserGroup[] = [];
    const storedOrgUserGroups: IUserGroup[] = [];
    for (const credential of credentials) {
      if (credential.type === AuthorizationCredential.OrganisationMember) {
        const organisation = await this.organisationService.getOrganisationOrFail(
          credential.resourceID
        );
        const orgResult = new MembershipResultEntryOrganisation(
          organisation.displayName,
          organisation.id,
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
        const parent = await this.userGroupService.getParent(group);
        if ('ecoverseID' in parent) {
          storedCommunityUserGroups.push(group);
        } else {
          storedOrgUserGroups.push(group);
        }
      }
    }

    // Assign to the right ecoverse
    for (const ecoverseResult of membership.ecoverses) {
      for (const challenge of storedChallenges) {
        if (challenge.ecoverseID === ecoverseResult.id) {
          const challengeResult = new MembershipResultEntry(
            challenge.nameID,
            challenge.id,
            challenge.displayName
          );
          ecoverseResult.challenges.push(challengeResult);
        }
      }
      for (const opportunity of storedOpportunities) {
        if (opportunity.ecoverseID === ecoverseResult.id) {
          const opportunityResult = new MembershipResultEntry(
            opportunity.nameID,
            opportunity.id,
            opportunity.displayName
          );
          ecoverseResult.opportunities.push(opportunityResult);
        }
      }
      for (const group of storedCommunityUserGroups) {
        const parent = await this.userGroupService.getParent(group);
        if ((parent as ICommunity).ecoverseID === ecoverseResult.id) {
          const groupResult = new MembershipResultEntry(
            group.name,
            group.id,
            group.name
          );
          ecoverseResult.userGroups.push(groupResult);
        }
      }
    }

    // Assign org groups
    for (const organisationResult of membership.organisations) {
      for (const group of storedOrgUserGroups) {
        const parent = await this.userGroupService.getParent(group);
        if ((parent as IOrganisation).id === organisationResult.id) {
          const groupResult = new MembershipResultEntry(
            group.name,
            group.id,
            group.name
          );
          organisationResult.userGroups.push(groupResult);
        }
      }
    }

    return membership;
  }

  async createEcoverseMembershipResult(
    ecoverseID: string
  ): Promise<MembershipResultEntryEcoverse> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(ecoverseID);
    return new MembershipResultEntryEcoverse(
      ecoverse.nameID,
      ecoverse.id,
      ecoverse.displayName
    );
  }
}
