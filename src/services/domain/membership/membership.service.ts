import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { Membership } from './membership.dto.result';
import { UserService } from '@domain/community/user/user.service';
import { MembershipInput } from './membership.dto.input';
import { MembershipResultEntryEcoverse } from './membership.dto.result.entry.ecoverse';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { AuthorizationCredential } from '@common/enums';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { IOrganisation } from '@domain/community/organisation';
import { MembershipResultEntryOrganisation } from './membership.dto.result.entry.organisation';
import { IChallenge } from '@domain/challenge/challenge';
import { IUserGroup } from '@domain/community/user-group';
import { MembershipResultEntry } from './membership.dto.result.entry';
import { ICommunity } from '@domain/community/community';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';

export class MembershipService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private ecoverseService: EcoverseService,
    private challengeService: ChallengeService,
    private opportunityService: OpportunityService,
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
          organisation.nameID,
          organisation.id,
          organisation.displayName
        );
        membership.organisations.push(orgResult);
      } else if (credential.type === AuthorizationCredential.EcoverseMember) {
        const ecoverse = await this.ecoverseService.getEcoverseOrFail(
          credential.resourceID
        );
        const ecoverseResult = new MembershipResultEntryEcoverse(
          ecoverse.nameID,
          ecoverse.id,
          ecoverse.displayName
        );
        membership.ecoverses.push(ecoverseResult);
      } else if (credential.type === AuthorizationCredential.ChallengeMember) {
        const challenge = await this.challengeService.getChallengeOrFail(
          credential.resourceID
        );
        storedChallenges.push(challenge);
      } else if (
        credential.type === AuthorizationCredential.OpportunityMember
      ) {
        const opportunity = await this.opportunityService.getOpportunityOrFail(
          credential.resourceID
        );
        storedOpportunities.push(opportunity);
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
