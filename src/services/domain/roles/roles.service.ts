import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HubService } from '@domain/challenge/hub/hub.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { Opportunity } from '@domain/collaboration/opportunity/opportunity.entity';
import { IOrganization } from '@domain/community/organization';
import { IUserGroup } from '@domain/community/user-group';
import { ICommunity } from '@domain/community/community';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { IUser } from '@domain/community/user/user.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { Repository } from 'typeorm/repository/Repository';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IGroupable } from '@domain/common';
import { RolesResult } from './dto/roles.dto.result';
import { RolesResultOrganization } from './dto/roles.dto.result.organization';
import { ApplicationForRoleResult } from './dto/roles.dto.result.application';
import { RolesUserInput } from './dto/roles.dto.input.user';
import { ContributorRoles } from './dto/roles.dto.result.contributor';
import { RolesOrganizationInput } from './dto/roles.dto.input.organization';
import { RolesResultHub } from './dto/roles.dto.result.hub';
import { ICredential } from '@domain/agent/credential/credential.interface';

export type UserGroupResult = {
  userGroup: IUserGroup;
  userGroupParent: IGroupable;
};
export class RolesService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private hubService: HubService,
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

  private ROLE_MEMBER = 'member';
  private ROLE_ASSOCIATE = 'associate';
  private ROLE_LEAD = 'lead';
  private ROLE_HOST = 'host';

  async getUserRoles(
    membershipData: RolesUserInput
  ): Promise<ContributorRoles> {
    const user = await this.userService.getUserWithAgent(membershipData.userID);
    const contributorRoles = await this.getContributorRoles(
      user.agent?.credentials || [],
      user.id
    );
    contributorRoles.applications = await this.getApplications(user);
    return contributorRoles;
  }

  async getOrganizationRoles(
    membershipData: RolesOrganizationInput
  ): Promise<ContributorRoles> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(
        membershipData.organizationID
      );
    const contributorRoles = await this.getContributorRoles(
      agent?.credentials || [],
      organization.id
    );
    return contributorRoles;
  }

  private async getContributorRoles(
    credentials: ICredential[],
    contributorID: string
  ): Promise<ContributorRoles> {
    const membership = new ContributorRoles();

    membership.id = contributorID;
    const hubsMap: Map<string, RolesResultHub> = new Map();
    const orgsMap: Map<string, RolesResultOrganization> = new Map();
    for (const credential of credentials) {
      if (credential.type === AuthorizationCredential.ORGANIZATION_MEMBER) {
        const orgResult = await this.ensureOrganizationRolesResult(
          orgsMap,
          credential.resourceID,
          contributorID
        );
        this.addRole(orgResult, this.ROLE_ASSOCIATE);
      } else if (credential.type === AuthorizationCredential.HUB_MEMBER) {
        const hubResult = await this.ensureHubRolesResult(
          hubsMap,
          credential.resourceID,
          contributorID
        );
        this.addRole(hubResult, this.ROLE_MEMBER);
      } else if (credential.type === AuthorizationCredential.HUB_HOST) {
        const hubResult = await this.ensureHubRolesResult(
          hubsMap,
          credential.resourceID,
          contributorID
        );
        this.addRole(hubResult, this.ROLE_HOST);
      } else if (credential.type === AuthorizationCredential.CHALLENGE_MEMBER) {
        const challengeResult = await this.ensureChallengeRolesResult(
          hubsMap,
          credential.resourceID,
          contributorID
        );
        this.addRole(challengeResult, this.ROLE_MEMBER);
      } else if (credential.type === AuthorizationCredential.CHALLENGE_LEAD) {
        const challengeResult = await this.ensureChallengeRolesResult(
          hubsMap,
          credential.resourceID,
          contributorID
        );
        this.addRole(challengeResult, this.ROLE_LEAD);
      } else if (
        credential.type === AuthorizationCredential.OPPORTUNITY_MEMBER
      ) {
        const opportunityResult = await this.ensureOpportunityRolesResult(
          hubsMap,
          credential.resourceID,
          contributorID
        );
        this.addRole(opportunityResult, this.ROLE_MEMBER);
      } else if (credential.type === AuthorizationCredential.OPPORTUNITY_LEAD) {
        const opportunityResult = await this.ensureOpportunityRolesResult(
          hubsMap,
          credential.resourceID,
          contributorID
        );
        this.addRole(opportunityResult, this.ROLE_LEAD);
      } else if (
        credential.type === AuthorizationCredential.USER_GROUP_MEMBER
      ) {
        const group = await this.userGroupService.getUserGroupOrFail(
          credential.resourceID
        );
        const parent = await this.userGroupService.getParent(group);
        if ('hubID' in parent) {
          const hubResult = await this.ensureHubRolesResult(
            hubsMap,
            (parent as ICommunity).hubID,
            contributorID
          );
          const groupResult = new RolesResult(group.name, group.id, group.name);
          hubResult.userGroups.push(groupResult);
        } else {
          const orgResult = await this.ensureOrganizationRolesResult(
            orgsMap,
            (parent as IOrganization).id,
            contributorID
          );
          const groupResult = new RolesResult(group.name, group.id, group.name);
          orgResult.userGroups.push(groupResult);
        }
      }
    }

    for (const hubResult of hubsMap.values()) {
      membership.hubs.push(hubResult);
    }
    for (const orgResult of orgsMap.values()) {
      membership.organizations.push(orgResult);
    }

    return membership;
  }

  async ensureOrganizationRolesResult(
    orgsMap: Map<string, RolesResultOrganization>,
    organizationID: string,
    contributorID: string
  ): Promise<RolesResultOrganization> {
    const existingOrgResult = orgsMap.get(organizationID);
    if (existingOrgResult) {
      return existingOrgResult;
    }
    // New org for roles, add an entry
    const organization = await this.organizationService.getOrganizationOrFail(
      organizationID
    );
    const newOrgResult = new RolesResultOrganization(
      organization,
      contributorID
    );
    orgsMap.set(organization.id, newOrgResult);
    return newOrgResult;
  }

  addRole(rolesResult: RolesResult, roleToAdd: string): void {
    if (rolesResult.roles.includes(roleToAdd)) {
      this.logger.warn?.(
        `Duplicate addition of role in result: ${roleToAdd} - already had '${rolesResult.roles}`,
        LogContext.ROLES
      );
    }
    rolesResult.roles.push(roleToAdd);
  }

  async ensureHubRolesResult(
    hubsMap: Map<string, RolesResultHub>,
    hubID: string,
    contributorID: string
  ): Promise<RolesResultHub> {
    const existingHubResult = hubsMap.get(hubID);
    if (existingHubResult) {
      return existingHubResult;
    }
    // New hub for roles, add an entry
    const hub = await this.hubService.getHubOrFail(hubID, {
      relations: ['community'],
    });
    const newHubResult = new RolesResultHub(hub, contributorID);
    hubsMap.set(hub.id, newHubResult);
    return newHubResult;
  }

  async ensureChallengeRolesResult(
    hubsMap: Map<string, RolesResultHub>,
    challengeID: string,
    contributorID: string
  ): Promise<RolesResult> {
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeID,
      { relations: ['community'] }
    );
    const hubResult = await this.ensureHubRolesResult(
      hubsMap,
      challenge.hubID,
      contributorID
    );

    const existingChallengeResult = hubResult.challenges.find(
      challengeResult => challengeResult.nameID === challenge.nameID
    );
    if (existingChallengeResult) return existingChallengeResult;

    // New challenge in this Hub
    const newChallengeResult = new RolesResult(
      challenge.nameID,
      challenge.id,
      challenge.displayName
    );
    hubResult.challenges.push(newChallengeResult);
    return newChallengeResult;
  }

  async ensureOpportunityRolesResult(
    hubsMap: Map<string, RolesResultHub>,
    opportunityID: string,
    contributorID: string
  ): Promise<RolesResult> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityID,
      { relations: ['community'] }
    );
    const hubResult = await this.ensureHubRolesResult(
      hubsMap,
      opportunity.hubID,
      contributorID
    );

    const existingOpportunityResult = hubResult.opportunities.find(
      opportunityResult => opportunityResult.nameID === opportunity.nameID
    );
    if (existingOpportunityResult) return existingOpportunityResult;

    // New opportunity in this Hub
    const newOpportunityResult = new RolesResult(
      opportunity.nameID,
      opportunity.id,
      opportunity.displayName
    );
    hubResult.challenges.push(newOpportunityResult);
    return newOpportunityResult;
  }

  async getApplications(user: IUser): Promise<ApplicationForRoleResult[]> {
    const applicationResults: ApplicationForRoleResult[] = [];
    const applications = await this.applicationService.findApplicationsForUser(
      user.id
    );
    for (const application of applications) {
      // skip any finalized applications; only want to return pending applications
      const isFinalized = await this.applicationService.isFinalizedApplication(
        application.id
      );
      if (isFinalized) continue;
      const community = application.community;
      const state = await this.applicationService.getApplicationState(
        application.id
      );
      if (community) {
        const applicationResult = new ApplicationForRoleResult(
          community.id,
          community.displayName,
          state,
          application.id,
          community.hubID, // Store the hub the application is for, regardless of level
          application.createdDate,
          application.updatedDate
        );

        const communityParent = await this.communityService.getParentCommunity(
          community
        );

        // not an hub
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

  private generateRandomSuffix(): string {
    return Math.floor(Math.random() * 100000).toString();
  }
}
