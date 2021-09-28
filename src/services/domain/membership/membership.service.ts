import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { MembershipUserInput } from './membership.dto.user.input';
import { MembershipUserResultEntryEcoverse } from './membership.dto.user.result.entry.ecoverse';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { AuthorizationCredential } from '@common/enums';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { IOrganization } from '@domain/community/organization';
import { MembershipUserResultEntryOrganization } from './membership.dto.user.result.entry.organization';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IUserGroup } from '@domain/community/user-group';
import { MembershipResultEntry } from './membership.dto.result.entry';
import { ICommunity } from '@domain/community/community';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { UserMembership } from './membership.dto.user.result';
import { MembershipOrganizationInput } from './membership.dto.organization.input';
import { OrganizationMembership } from './membership.dto.organization.result';
import { ApplicationService } from '@domain/community/application/application.service';
import { ApplicationResultEntry } from './membership.dto.application.result.entry';
import { IUser } from '@domain/community/user/user.interface';

export class MembershipService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private ecoverseService: EcoverseService,
    private challengeService: ChallengeService,
    private applicationService: ApplicationService,
    private opportunityService: OpportunityService,
    private organizationService: OrganizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getUserMemberships(
    membershipData: MembershipUserInput
  ): Promise<UserMembership> {
    const membership = new UserMembership();

    const user = await this.userService.getUserWithAgent(membershipData.userID);
    const credentials = user.agent?.credentials;
    if (!credentials) {
      return membership;
    }
    membership.id = user.id;
    const storedChallenges: IChallenge[] = [];
    const storedOpportunities: IOpportunity[] = [];
    const storedCommunityUserGroups: IUserGroup[] = [];
    const storedOrgUserGroups: IUserGroup[] = [];
    for (const credential of credentials) {
      if (credential.type === AuthorizationCredential.ORGANIZATION_MEMBER) {
        membership.organizations.push(
          await this.createOrganizationResult(credential.resourceID, user.id)
        );
      } else if (credential.type === AuthorizationCredential.ECOVERSE_MEMBER) {
        membership.ecoverses.push(
          await this.createEcoverseMembershipResult(
            credential.resourceID,
            user.id
          )
        );
      } else if (credential.type === AuthorizationCredential.CHALLENGE_MEMBER) {
        const challenge = await this.challengeService.getChallengeOrFail(
          credential.resourceID
        );
        storedChallenges.push(challenge);
      } else if (
        credential.type === AuthorizationCredential.OPPORTUNITY_MEMBER
      ) {
        const opportunity = await this.opportunityService.getOpportunityOrFail(
          credential.resourceID
        );
        storedOpportunities.push(opportunity);
      } else if (
        credential.type === AuthorizationCredential.USER_GROUP_MEMBER
      ) {
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
        if (challenge.ecoverseID === ecoverseResult.ecoverseID) {
          const challengeResult = new MembershipResultEntry(
            challenge.nameID,
            challenge.id,
            challenge.displayName
          );
          ecoverseResult.challenges.push(challengeResult);
        }
      }
      for (const opportunity of storedOpportunities) {
        if (opportunity.ecoverseID === ecoverseResult.ecoverseID) {
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
        if ((parent as ICommunity).ecoverseID === ecoverseResult.ecoverseID) {
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
    for (const organizationResult of membership.organizations) {
      for (const group of storedOrgUserGroups) {
        const parent = await this.userGroupService.getParent(group);
        if (
          (parent as IOrganization).id === organizationResult.organizationID
        ) {
          const groupResult = new MembershipResultEntry(
            group.name,
            group.id,
            group.name
          );
          organizationResult.userGroups.push(groupResult);
        }
      }
    }

    membership.applications = await this.getApplications(user);

    return membership;
  }

  async createOrganizationResult(
    organizationID: string,
    userID: string
  ): Promise<MembershipUserResultEntryOrganization> {
    const organization = await this.organizationService.getOrganizationOrFail(
      organizationID
    );
    return new MembershipUserResultEntryOrganization(
      organization.nameID,
      organization.id,
      organization.displayName,
      userID
    );
  }

  async createEcoverseMembershipResult(
    ecoverseID: string,
    userID: string
  ): Promise<MembershipUserResultEntryEcoverse> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(ecoverseID);
    return new MembershipUserResultEntryEcoverse(
      ecoverse.nameID,
      ecoverse.id,
      ecoverse.displayName,
      userID
    );
  }

  async getOrganizationMemberships(
    membershipData: MembershipOrganizationInput
  ): Promise<OrganizationMembership> {
    const membership = new OrganizationMembership();
    const organization = await this.organizationService.getOrganizationOrFail(
      membershipData.organizationID,
      {
        relations: ['agent'],
      }
    );
    membership.id = organization.id;

    const agent = organization?.agent;
    if (agent?.credentials) {
      for (const credential of agent.credentials) {
        if (credential.type === AuthorizationCredential.ECOVERSE_HOST) {
          const ecoverse = await this.ecoverseService.getEcoverseOrFail(
            credential.resourceID
          );
          membership.ecoversesHosting.push({
            nameID: ecoverse.nameID,
            id: `${ecoverse.id}`, // note: may way to make this a unique membership identifier for client caching
            displayName: ecoverse.displayName,
          });
        } else if (credential.type === AuthorizationCredential.CHALLENGE_LEAD) {
          const challenge = await this.challengeService.getChallengeOrFail(
            credential.resourceID
          );
          membership.challengesLeading.push({
            nameID: challenge.nameID,
            id: `${challenge.id}`, // note: may way to make this a unique membership identifier for client caching
            displayName: challenge.displayName,
            ecoverseID: challenge.ecoverseID,
          });
        }
      }
    }
    return membership;
  }

  async getApplications(user: IUser): Promise<ApplicationResultEntry[]> {
    const applicationResults: ApplicationResultEntry[] = [];
    const applications = await this.applicationService.findApplicationsForUser(
      user.id
    );
    for (const application of applications) {
      const community = application.community;
      const state = await this.applicationService.getApplicationState(
        application.id
      );
      if (community) {
        const applicationResult = new ApplicationResultEntry(
          community.id,
          community.displayName,
          state,
          application.id
        );
        applicationResults.push(applicationResult);
      }
    }
    return applicationResults;
  }
}
