import { EntityManager } from 'typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HubService } from '@domain/challenge/hub/hub.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { LogContext } from '@common/enums';
import { ICommunity } from '@domain/community/community';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { IUser } from '@domain/community/user/user.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { IApplication } from '@domain/community';
import { HubVisibility } from '@common/enums/hub.visibility';
import { HubFilterService } from '@services/infrastructure/hub-filter/hub.filter.service';
import { RolesUserInput } from './dto/roles.dto.input.user';
import { ContributorRoles } from './dto/roles.dto.result.contributor';
import { ApplicationForRoleResult } from './dto/roles.dto.result.application';
import { RolesOrganizationInput } from './dto/roles.dto.input.organization';
import { mapCredentialsToRoles } from './util/map.credentials.to.roles';

export class RolesService {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
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
    return this.getContributorRoles(
      agent?.credentials || [],
      organization.id,
      allowedVisibilities
    );
  }

  private async getContributorRoles(
    credentials: ICredential[],
    contributorID: string,
    hubVisibilities: HubVisibility[]
  ): Promise<ContributorRoles> {
    const membership = new ContributorRoles();

    membership.id = contributorID;

    const maps = await mapCredentialsToRoles(
      this.entityManager,
      credentials,
      hubVisibilities
    );
    membership.hubs = maps.hubs;
    membership.organizations = maps.organizations;

    return membership;
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
