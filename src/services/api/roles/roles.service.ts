import { EntityManager } from 'typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { LogContext } from '@common/enums';
import { ICommunity } from '@domain/community/community';
import { OpportunityService } from '@domain/challenge/opportunity/opportunity.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { CommunityService } from '@domain/community/community/community.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { IApplication } from '@domain/community/application';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { RolesUserInput } from './dto/roles.dto.input.user';
import { ContributorRoles } from './dto/roles.dto.result.contributor';
import { ApplicationForRoleResult } from './dto/roles.dto.result.application';
import { RolesOrganizationInput } from './dto/roles.dto.input.organization';
import { mapJourneyCredentialsToRoles } from './util/map.journey.credentials.to.roles';
import { InvitationForRoleResult } from './dto/roles.dto.result.invitation';
import { InvitationService } from '@domain/community/invitation/invitation.service';
import { IInvitation } from '@domain/community/invitation';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RolesResultOrganization } from './dto/roles.dto.result.organization';
import { mapOrganizationCredentialsToRoles } from './util/map.organization.credentials.to.roles';
import { RolesResultSpace } from './dto/roles.dto.result.space';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';

export class RolesService {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    private userService: UserService,
    private challengeService: ChallengeService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private communityService: CommunityService,
    private opportunityService: OpportunityService,
    private spaceFilterService: SpaceFilterService,
    private communityResolverService: CommunityResolverService,
    private authorizationService: AuthorizationService,
    private organizationService: OrganizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getRolesForUser(
    membershipData: RolesUserInput
  ): Promise<ContributorRoles> {
    const contributorRoles = new ContributorRoles();
    const user = await this.userService.getUserWithAgent(membershipData.userID);

    contributorRoles.id = membershipData.userID;
    contributorRoles.filter = membershipData.filter;
    contributorRoles.credentials = user.agent?.credentials || [];

    return contributorRoles;
  }

  async getRolesForOrganization(
    membershipData: RolesOrganizationInput
  ): Promise<ContributorRoles> {
    const contributorRoles = new ContributorRoles();

    const { agent } = await this.organizationService.getOrganizationAndAgent(
      membershipData.organizationID
    );

    contributorRoles.id = membershipData.organizationID;
    contributorRoles.filter = membershipData.filter;
    contributorRoles.credentials = agent?.credentials || [];

    return contributorRoles;
  }

  async getOrganizationRolesForUser(
    roles: ContributorRoles
  ): Promise<RolesResultOrganization[]> {
    return await mapOrganizationCredentialsToRoles(
      this.entityManager,
      roles.credentials
    );
  }

  public async getJourneyRolesForContributor(
    roles: ContributorRoles,
    agentInfo: AgentInfo
  ): Promise<RolesResultSpace[]> {
    const allowedVisibilities = this.spaceFilterService.getAllowedVisibilities(
      roles.filter
    );

    return await mapJourneyCredentialsToRoles(
      this.entityManager,
      roles.credentials,
      allowedVisibilities,
      agentInfo,
      this.authorizationService
    );
  }

  public async getUserApplications(
    userID: string,
    states?: string[]
  ): Promise<ApplicationForRoleResult[]> {
    const applicationResults: ApplicationForRoleResult[] = [];
    const applications = await this.applicationService.findApplicationsForUser(
      userID,
      states
    );
    for (const application of applications) {
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
    const communityDisplayName =
      await this.communityResolverService.getDisplayNameForCommunityOrFail(
        community.id,
        community.type
      );
    const spaceID =
      await this.communityResolverService.getRootSpaceFromCommunityOrFail(
        community
      );
    const applicationResult = new ApplicationForRoleResult(
      community.id,
      communityDisplayName,
      state,
      application.id,
      spaceID,
      application.createdDate,
      application.updatedDate
    );

    const isSpaceCommunity = await this.communityService.isSpaceCommunity(
      community
    );

    if (isSpaceCommunity) return applicationResult;

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

  public async getUserInvitations(
    userID: string,
    states?: string[]
  ): Promise<InvitationForRoleResult[]> {
    const invitationResults: InvitationForRoleResult[] = [];
    const invitations = await this.invitationService.findInvitationsForUser(
      userID,
      states
    );

    if (!invitations) return [];

    for (const invitation of invitations) {
      const community = invitation.community;
      const state = await this.invitationService.getInvitationState(
        invitation.id
      );
      if (community) {
        const invitationResult =
          await this.buildInvitationResultForCommunityInvitation(
            community,
            state,
            invitation
          );

        invitationResults.push(invitationResult);
      }
    }
    return invitationResults;
  }

  private async buildInvitationResultForCommunityInvitation(
    community: ICommunity,
    state: string,
    invitation: IInvitation
  ): Promise<InvitationForRoleResult> {
    const communityDisplayName =
      await this.communityResolverService.getDisplayNameForCommunityOrFail(
        community.id,
        community.type
      );
    const spaceID =
      await this.communityResolverService.getRootSpaceFromCommunityOrFail(
        community
      );

    const invitationResult = new InvitationForRoleResult(
      community.id,
      communityDisplayName,
      state,
      invitation.id,
      spaceID,
      invitation.createdDate,
      invitation.updatedDate
    );

    invitationResult.createdBy = invitation.createdBy;
    invitationResult.welcomeMessage = invitation.welcomeMessage;

    const isSpaceCommunity = await this.communityService.isSpaceCommunity(
      community
    );

    if (isSpaceCommunity) return invitationResult;

    // For Challenge or an Opportunity, need to dig deeper...
    const challengeForCommunity =
      await this.challengeService.getChallengeForCommunity(community.id);

    if (challengeForCommunity) {
      // the invitation is issued for a challenge
      invitationResult.challengeID = challengeForCommunity.id;
      return invitationResult;
    }

    const opportunityForCommunity =
      await this.opportunityService.getOpportunityForCommunity(community.id);

    if (!opportunityForCommunity || !opportunityForCommunity.challenge) {
      throw new RelationshipNotFoundException(
        `Unable to find Challenge or Opportunity with the community specified: ${community.id}`,
        LogContext.COMMUNITY
      );
    }

    // the invitation is issued for an an opportunity
    invitationResult.opportunityID = opportunityForCommunity.id;
    invitationResult.challengeID = opportunityForCommunity.challenge.id;
    return invitationResult;
  }
}
