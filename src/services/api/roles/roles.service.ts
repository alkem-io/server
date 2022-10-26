import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HubService } from '@domain/challenge/hub/hub.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { IUserGroup } from '@domain/community/user-group';
import { ICommunity } from '@domain/community/community';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { IUser } from '@domain/community/user/user.interface';
import { CommunityService } from '@domain/community/community/community.service';
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
import {
  ROLE_ASSOCIATE,
  ROLE_HOST,
  ROLE_LEAD,
  ROLE_MEMBER,
} from '@common/constants';
import { IApplication } from '@domain/community';
import { isCommunity, isOrganization } from '@common/utils/groupable.util';
import { RolesResultCommunity } from './dto/roles.dto.result.community';
import { HubVisibility } from '@common/enums/hub.visibility';
import { HubFilterService } from '@services/infrastructure/hub-filter/hub.filter.service';

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
    private hubFilterService: HubFilterService,
    private organizationService: OrganizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}
  async getUserRoles(
    membershipData: RolesUserInput
  ): Promise<ContributorRoles> {
    const user = await this.userService.getUserWithAgent(membershipData.userID);
    const allowedVisibilities = this.hubFilterService.getAllowedVisibilities(
      membershipData.filter
    );

    const contributorRoles = await this.getContributorRoles(
      user.agent?.credentials || [],
      user.id,
      allowedVisibilities
    );
    contributorRoles.applications = await this.getUserApplications(user);
    return contributorRoles;
  }

  async getOrganizationRoles(
    membershipData: RolesOrganizationInput
  ): Promise<ContributorRoles> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(
        membershipData.organizationID
      );
    const allowedVisibilities = this.hubFilterService.getAllowedVisibilities(
      membershipData.filter
    );
    const contributorRoles = await this.getContributorRoles(
      agent?.credentials || [],
      organization.id,
      allowedVisibilities
    );
    return contributorRoles;
  }

  private async getContributorRoles(
    credentials: ICredential[],
    contributorID: string,
    hubVisibilities: HubVisibility[]
  ): Promise<ContributorRoles> {
    const membership = new ContributorRoles();

    membership.id = contributorID;
    const hubsMap: Map<string, RolesResultHub> = new Map();
    const orgsMap: Map<string, RolesResultOrganization> = new Map();
    await this.mapCredentialsToRoles(
      credentials,
      orgsMap,
      hubsMap,
      hubVisibilities
    );

    membership.hubs.push(...hubsMap.values());
    membership.organizations.push(...orgsMap.values());

    return membership;
  }

  private async mapCredentialsToRoles(
    credentials: ICredential[],
    orgsMap: Map<string, RolesResultOrganization>,
    hubsMap: Map<string, RolesResultHub>,
    allowedVisibilities: HubVisibility[]
  ) {
    for (const credential of credentials) {
      switch (credential.type) {
        case AuthorizationCredential.ORGANIZATION_ASSOCIATE:
          await this.addOrganizationAssociateRole(orgsMap, credential);
          break;
        case AuthorizationCredential.HUB_MEMBER:
          await this.addHubMemberRole(hubsMap, credential);
          break;
        case AuthorizationCredential.HUB_HOST:
          await this.addHubHostRole(hubsMap, credential);
          break;
        case AuthorizationCredential.CHALLENGE_LEAD:
          await this.addChallengeLeadRole(hubsMap, credential);
          break;
        case AuthorizationCredential.CHALLENGE_MEMBER:
          await this.addChallengeMemberRole(hubsMap, credential);
          break;
        case AuthorizationCredential.OPPORTUNITY_MEMBER:
          await this.addOpportunityMemberRole(hubsMap, credential);
          break;
        case AuthorizationCredential.OPPORTUNITY_LEAD:
          await this.addOpportunityLeadRole(hubsMap, credential);
          break;
        case AuthorizationCredential.USER_GROUP_MEMBER:
          await this.addUserGroupMemberRole(hubsMap, orgsMap, credential);
          break;
      }
    }
    // Iterate over the hubsMap and remove those whose visibility does not match the provided filter
    for (const hubResult of hubsMap.values()) {
      const visibilityMatched = this.hubFilterService.isVisible(
        hubResult.hub.visibility,
        allowedVisibilities
      );
      if (!visibilityMatched) {
        hubsMap.delete(hubResult.hubID);
      }
    }
  }

  private async addUserGroupMemberRole(
    hubsMap: Map<string, RolesResultHub>,
    orgsMap: Map<string, RolesResultOrganization>,
    credential: ICredential
  ) {
    const group = await this.userGroupService.getUserGroupOrFail(
      credential.resourceID
    );
    const parent = await this.userGroupService.getParent(group);
    if (isCommunity(parent)) {
      const hubResult = await this.ensureHubRolesResult(hubsMap, parent.hubID);
      const groupResult = new RolesResult(group.name, group.id, group.name);
      hubResult.userGroups.push(groupResult);
    } else if (isOrganization(parent)) {
      const orgResult = await this.ensureOrganizationRolesResult(
        orgsMap,
        parent.id
      );
      const groupResult = new RolesResult(group.name, group.id, group.name);
      orgResult.userGroups.push(groupResult);
    }

    // throw
  }

  private async addOpportunityLeadRole(
    hubsMap: Map<string, RolesResultHub>,
    credential: ICredential
  ) {
    const opportunityResult = await this.ensureOpportunityRolesResult(
      hubsMap,
      credential.resourceID
    );
    this.addRole(opportunityResult, ROLE_LEAD);
  }

  private async addOpportunityMemberRole(
    hubsMap: Map<string, RolesResultHub>,
    credential: ICredential
  ) {
    const opportunityResult = await this.ensureOpportunityRolesResult(
      hubsMap,
      credential.resourceID
    );
    this.addRole(opportunityResult, ROLE_MEMBER);
  }

  private async addChallengeLeadRole(
    hubsMap: Map<string, RolesResultHub>,
    credential: ICredential
  ) {
    const challengeResult = await this.ensureChallengeRolesResult(
      hubsMap,
      credential.resourceID
    );
    this.addRole(challengeResult, ROLE_LEAD);
  }

  private async addChallengeMemberRole(
    hubsMap: Map<string, RolesResultHub>,
    credential: ICredential
  ) {
    const challengeResult = await this.ensureChallengeRolesResult(
      hubsMap,
      credential.resourceID
    );
    this.addRole(challengeResult, ROLE_MEMBER);
  }

  private async addHubHostRole(
    hubsMap: Map<string, RolesResultHub>,
    credential: ICredential
  ) {
    const hubResult = await this.ensureHubRolesResult(
      hubsMap,
      credential.resourceID
    );
    this.addRole(hubResult, ROLE_HOST);
  }

  private async addHubMemberRole(
    hubsMap: Map<string, RolesResultHub>,
    credential: ICredential
  ) {
    const hubResult = await this.ensureHubRolesResult(
      hubsMap,
      credential.resourceID
    );
    this.addRole(hubResult, ROLE_MEMBER);
  }

  private async addOrganizationAssociateRole(
    orgsMap: Map<string, RolesResultOrganization>,
    credential: ICredential
  ) {
    const orgResult = await this.ensureOrganizationRolesResult(
      orgsMap,
      credential.resourceID
    );
    this.addRole(orgResult, ROLE_ASSOCIATE);
  }

  private async ensureOrganizationRolesResult(
    orgsMap: Map<string, RolesResultOrganization>,
    organizationID: string
  ): Promise<RolesResultOrganization> {
    const existingOrgResult = orgsMap.get(organizationID);
    if (existingOrgResult) {
      return existingOrgResult;
    }
    // New org for roles, add an entry
    const organization = await this.organizationService.getOrganizationOrFail(
      organizationID
    );
    const newOrgResult = new RolesResultOrganization(organization);
    orgsMap.set(organization.id, newOrgResult);
    return newOrgResult;
  }

  private addRole(rolesResult: RolesResult, roleToAdd: string): void {
    if (rolesResult.roles.includes(roleToAdd)) {
      this.logger.warn?.(
        `Duplicate addition of role in result: ${roleToAdd} - already had '${rolesResult.roles}`,
        LogContext.ROLES
      );
    }
    rolesResult.roles.push(roleToAdd);
  }

  private async ensureHubRolesResult(
    hubsMap: Map<string, RolesResultHub>,
    hubID: string
  ): Promise<RolesResultHub> {
    const existingHubResult = hubsMap.get(hubID);
    if (existingHubResult) {
      return existingHubResult;
    }
    // New hub for roles, add an entry
    const hub = await this.hubService.getHubOrFail(hubID, {
      relations: ['community'],
    });
    const newHubResult = new RolesResultHub(hub);
    hubsMap.set(hub.id, newHubResult);
    return newHubResult;
  }

  private async ensureChallengeRolesResult(
    hubsMap: Map<string, RolesResultHub>,
    challengeID: string
  ): Promise<RolesResult> {
    const challenge = await this.challengeService.getChallengeOrFail(
      challengeID,
      { relations: ['community'] }
    );
    const hubResult = await this.ensureHubRolesResult(
      hubsMap,
      this.challengeService.getHubID(challenge)
    );

    const existingChallengeResult = hubResult.challenges.find(
      challengeResult => challengeResult.nameID === challenge.nameID
    );
    if (existingChallengeResult) return existingChallengeResult;

    // New challenge in this Hub
    const newChallengeResult = new RolesResultCommunity(
      challenge.nameID,
      challenge.id,
      challenge.displayName
    );
    hubResult.challenges.push(newChallengeResult);
    return newChallengeResult;
  }

  private async ensureOpportunityRolesResult(
    hubsMap: Map<string, RolesResultHub>,
    opportunityID: string
  ): Promise<RolesResult> {
    const opportunity = await this.opportunityService.getOpportunityOrFail(
      opportunityID,
      { relations: ['community'] }
    );
    const hubResult = await this.ensureHubRolesResult(
      hubsMap,
      this.opportunityService.getHubID(opportunity)
    );

    const existingOpportunityResult = hubResult.opportunities.find(
      opportunityResult => opportunityResult.nameID === opportunity.nameID
    );
    if (existingOpportunityResult) return existingOpportunityResult;

    // New opportunity in this Hub
    const newOpportunityResult = new RolesResultCommunity(
      opportunity.nameID,
      opportunity.id,
      opportunity.displayName
    );
    hubResult.opportunities.push(newOpportunityResult);
    return newOpportunityResult;
  }

  private async getUserApplications(
    user: IUser
  ): Promise<ApplicationForRoleResult[]> {
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
        const applicationResult =
          await this.buildApplicationResultForCommunityApplication(
            community,
            state,
            application
          );

        applicationResults.push(applicationResult);
      }
    }
    return applicationResults;
  }

  private async buildApplicationResultForCommunityApplication(
    community: ICommunity,
    state: string,
    application: IApplication
  ): Promise<ApplicationForRoleResult> {
    const applicationResult = new ApplicationForRoleResult(
      community.id,
      community.displayName,
      state,
      application.id,
      community.hubID,
      application.createdDate,
      application.updatedDate
    );

    const isHubCommunity = await this.communityService.isHubCommunity(
      community
    );

    if (isHubCommunity) return applicationResult;

    // For Challenge or an Opportunity, need to dig deeper...
    const challengeForCommunity =
      await this.challengeService.getChallengeForCommunity(community.id);

    if (challengeForCommunity) {
      // the application is issued for a challenge
      applicationResult.challengeID = challengeForCommunity.id;
      return applicationResult;
    }

    const opportunityForCommunity =
      await this.opportunityService.getOpportunityForCommunity(community.id);

    if (!opportunityForCommunity || !opportunityForCommunity.challenge) {
      throw new RelationshipNotFoundException(
        `Unable to find Challenge or Opportunity with the community specified: ${community.id}`,
        LogContext.COMMUNITY
      );
    }

    // the application is issued for an an opportunity
    applicationResult.opportunityID = opportunityForCommunity.id;
    applicationResult.challengeID = opportunityForCommunity.challenge.id;
    return applicationResult;
  }
}
