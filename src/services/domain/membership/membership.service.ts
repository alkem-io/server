import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EcoverseService } from '@domain/challenge/ecoverse/ecoverse.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { MembershipUserInput } from './membership.dto.user.input';
import { MembershipUserResultEntryEcoverse } from './membership.dto.user.result.entry.ecoverse';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
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
import { MembershipCommunityResultEntry } from './membership.dto.community.result.entry';
import { IEcoverse } from '@domain/challenge/ecoverse/ecoverse.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { Repository } from 'typeorm/repository/Repository';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IGroupable } from '@domain/common';

export type UserGroupResult = {
  userGroup: IUserGroup;
  userGroupParent: IGroupable;
};
export class MembershipService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private ecoverseService: EcoverseService,
    private challengeService: ChallengeService,
    private applicationService: ApplicationService,
    private communityService: CommunityService,
    private opportunityService: OpportunityService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
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
    const storedEcoverse: IEcoverse[] = [];
    const storedChallenges: IChallenge[] = [];
    const storedOpportunities: IOpportunity[] = [];
    const storedCommunityUserGroupResults: UserGroupResult[] = [];
    const storedOrgUserGroupResults: UserGroupResult[] = [];
    for (const credential of credentials) {
      if (credential.type === AuthorizationCredential.ORGANIZATION_MEMBER) {
        membership.organizations.push(
          await this.createOrganizationResult(credential.resourceID, user.id)
        );
      } else if (credential.type === AuthorizationCredential.ECOVERSE_MEMBER) {
        const response = await this.createEcoverseMembershipResult(
          credential.resourceID,
          user.id
        );
        membership.ecoverses.push(response.entry);
        storedEcoverse.push(response.ecoverse);
      } else if (credential.type === AuthorizationCredential.CHALLENGE_MEMBER) {
        const challenge = await this.challengeService.getChallengeOrFail(
          credential.resourceID,
          { relations: ['community'] }
        );
        storedChallenges.push(challenge);
      } else if (
        credential.type === AuthorizationCredential.OPPORTUNITY_MEMBER
      ) {
        const opportunity = await this.opportunityService.getOpportunityOrFail(
          credential.resourceID,
          { relations: ['community'] }
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
          storedCommunityUserGroupResults.push({
            userGroup: group,
            userGroupParent: parent,
          });
        } else {
          storedOrgUserGroupResults.push({
            userGroup: group,
            userGroupParent: parent,
          });
        }
      }
    }

    membership.communities = [];

    // Assign to the right ecoverse
    for (const ecoverseResult of membership.ecoverses) {
      const community = storedEcoverse.find(
        se => se.id === ecoverseResult.id
      )?.community;
      if (community) {
        membership.communities.push(community);
      }

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
      for (const userGroupResult of storedCommunityUserGroupResults) {
        const parent = userGroupResult.userGroupParent;
        const group = userGroupResult.userGroup;
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
      for (const userGroupResult of storedOrgUserGroupResults) {
        const parent = userGroupResult.userGroupParent;
        const group = userGroupResult.userGroup;
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
  ): Promise<{
    entry: MembershipUserResultEntryEcoverse;
    ecoverse: IEcoverse;
  }> {
    const ecoverse = await this.ecoverseService.getEcoverseOrFail(ecoverseID, {
      relations: ['community'],
    });
    return {
      entry: new MembershipUserResultEntryEcoverse(
        ecoverse.nameID,
        ecoverse.id,
        ecoverse.displayName,
        userID
      ),
      ecoverse,
    };
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
          application.id,
          community.ecoverseID, // Store the ecoverse the application is for, regardless of level
          application.createdDate,
          application.updatedDate
        );

        const communityParent = await this.communityService.getParentCommunity(
          community
        );

        // not an ecoverse
        if (communityParent) {
          // For Challenge or an Opportunity, need to dig deeper...
          const challengeForCommunity = await this.challengeRepository
            .createQueryBuilder('challenge')
            .leftJoinAndSelect('challenge.community', 'community')
            .orWhere('community.id like :communityID')
            .setParameters({ communityID: `%${community.id}%` })
            .getOne();
          if (challengeForCommunity) {
            // the application is issued for a challenge
            applicationResult.challengeID = challengeForCommunity.id;
          } else {
            const opportunityForCommunity = await this.opportunityRepository
              .createQueryBuilder('opportunity')
              .leftJoinAndSelect('opportunity.challenge', 'challenge')
              .leftJoinAndSelect('opportunity.community', 'community')
              .orWhere('community.id like :communityID')
              .setParameters({ communityID: `%${community.id}%` })
              .getOne();

            if (
              !opportunityForCommunity ||
              !opportunityForCommunity.challenge
            ) {
              throw new RelationshipNotFoundException(
                `Unable to find Challenge or Opportunity with the community specified: ${community.id}`,
                LogContext.COMMUNITY
              );
            }

            // the application is issued for an an opportunity
            applicationResult.opportunityID = opportunityForCommunity.id;
            applicationResult.challengeID =
              opportunityForCommunity.challenge.id;
          }
        }

        applicationResults.push(applicationResult);
      }
    }
    return applicationResults;
  }
}
