import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OrganisationService } from '@domain/community/organisation/organisation.service';
import { UserService } from '@domain/community/user/user.service';
import { MembershipUserInput } from './membership.dto.user.input';
import { MembershipUserResultEntryEcoverse } from './membership.dto.user.result.entry.ecoverse';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { AuthorizationCredential } from '@common/enums';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { IOrganisation } from '@domain/community/organisation';
import { MembershipUserResultEntryOrganisation } from './membership.dto.user.result.entry.organisation';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IUserGroup } from '@domain/community/user-group';
import { MembershipResultEntry } from './membership.dto.result.entry';
import { ICommunity } from '@domain/community/community';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { UserMembership } from './membership.dto.user.result';
import { MembershipOrganisationInput } from './membership.dto.organisation.input';
import { OrganisationMembership } from './membership.dto.organisation.result';
import { ApplicationService } from '@domain/community/application/application.service';
import { ApplicationResultEntry } from './membership.dto.application.result.entry';
import { IUser } from '@domain/community/user/user.interface';
import { MembershipCommunityResultEntry } from './membership.dto.community.result.entry';

export class MembershipService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private ecoverseService: EcoverseService,
    private challengeService: ChallengeService,
    private applicationService: ApplicationService,
    private opportunityService: OpportunityService,
    private organisationService: OrganisationService,
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
      if (credential.type === AuthorizationCredential.OrganisationMember) {
        membership.organisations.push(
          await this.createOrganisationResult(credential.resourceID, user.id)
        );
      } else if (credential.type === AuthorizationCredential.EcoverseMember) {
        membership.ecoverses.push(
          await this.createEcoverseMembershipResult(
            credential.resourceID,
            user.id
          )
        );
      } else if (credential.type === AuthorizationCredential.ChallengeMember) {
        const challenge = await this.challengeService.getChallengeOrFail(
          credential.resourceID,
          { relations: ['community'] }
        );
        storedChallenges.push(challenge);
      } else if (
        credential.type === AuthorizationCredential.OpportunityMember
      ) {
        const opportunity = await this.opportunityService.getOpportunityOrFail(
          credential.resourceID,
          { relations: ['community'] }
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

    membership.communities = [];

    // Assign to the right ecoverse
    for (const ecoverseResult of membership.ecoverses) {
      membership.communities.push(ecoverseResult.community);

      for (const challenge of storedChallenges) {
        if (challenge.ecoverseID === ecoverseResult.ecoverseID) {
          const challengeResult = new MembershipResultEntry(
            challenge.nameID,
            challenge.id,
            challenge.displayName
          );
          ecoverseResult.challenges.push(challengeResult);
          if (challenge.community) {
            membership.communities.push(
              new MembershipCommunityResultEntry(
                challenge.community?.id,
                challenge.displayName
              )
            );
          }
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
          if (opportunity.community) {
            membership.communities.push(
              new MembershipCommunityResultEntry(
                opportunity.community?.id,
                opportunity.displayName
              )
            );
          }
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
    for (const organisationResult of membership.organisations) {
      for (const group of storedOrgUserGroups) {
        const parent = await this.userGroupService.getParent(group);
        if (
          (parent as IOrganisation).id === organisationResult.organisationID
        ) {
          const groupResult = new MembershipResultEntry(
            group.name,
            group.id,
            group.name
          );
          organisationResult.userGroups.push(groupResult);
        }
      }
    }

    membership.applications = await this.getApplications(user);

    return membership;
  }

  async createOrganisationResult(
    organisationID: string,
    userID: string
  ): Promise<MembershipUserResultEntryOrganisation> {
    const organisation = await this.organisationService.getOrganisationOrFail(
      organisationID
    );
    return new MembershipUserResultEntryOrganisation(
      organisation.nameID,
      organisation.id,
      organisation.displayName,
      userID
    );
  }

  async createEcoverseMembershipResult(
    ecoverseID: string,
    userID: string
  ): Promise<MembershipUserResultEntryEcoverse> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(ecoverseID, {
      relations: ['community'],
    });
    return new MembershipUserResultEntryEcoverse(
      ecoverse.nameID,
      ecoverse.id,
      ecoverse.displayName,
      userID,
      ecoverse.community?.id || ''
    );
  }

  async getOrganisationMemberships(
    membershipData: MembershipOrganisationInput
  ): Promise<OrganisationMembership> {
    const membership = new OrganisationMembership();
    const organisation = await this.organisationService.getOrganisationOrFail(
      membershipData.organisationID,
      {
        relations: ['agent'],
      }
    );
    membership.id = organisation.id;

    const agent = organisation?.agent;
    if (agent?.credentials) {
      for (const credential of agent.credentials) {
        if (credential.type === AuthorizationCredential.EcoverseHost) {
          const ecoverse = await this.ecoverseService.getEcoverseOrFail(
            credential.resourceID
          );
          membership.ecoversesHosting.push({
            nameID: ecoverse.nameID,
            id: ecoverse.id,
            displayName: ecoverse.displayName,
          });
        } else if (credential.type === AuthorizationCredential.ChallengeLead) {
          const challenge = await this.challengeService.getChallengeOrFail(
            credential.resourceID
          );
          membership.challengesLeading.push({
            nameID: challenge.nameID,
            id: challenge.id,
            displayName: challenge.displayName,
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
