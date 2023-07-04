import { EntityManager } from 'typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { LogContext } from '@common/enums';
import { ICommunity } from '@domain/community/community';
import { OpportunityService } from '@domain/collaboration/opportunity/opportunity.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { IUser } from '@domain/community/user/user.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { ICredential } from '@domain/agent/credential/credential.interface';
import { IApplication } from '@domain/community/application';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { RolesUserInput } from './dto/roles.dto.input.user';
import { ContributorRoles } from './dto/roles.dto.result.contributor';
import { ApplicationForRoleResult } from './dto/roles.dto.result.application';
import { RolesOrganizationInput } from './dto/roles.dto.input.organization';
import { mapCredentialsToRoles } from './util/map.credentials.to.roles';
import { InvitationForRoleResult } from './dto/roles.dto.result.invitation';
import { InvitationService } from '@domain/community/invitation/invitation.service';
import { IInvitation } from '@domain/community/invitation';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';

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
    private organizationService: OrganizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getUserRoles(
    membershipData: RolesUserInput
  ): Promise<ContributorRoles> {
    const user = await this.userService.getUserWithAgent(membershipData.userID);

    const allowedVisibilities = this.spaceFilterService.getAllowedVisibilities(
      membershipData.filter
    );

    const contributorRoles = await this.getContributorRoles(
      user.agent?.credentials || [],
      user.id,
      allowedVisibilities
    );

    contributorRoles.applications = await this.getUserApplications(user);
    contributorRoles.invitations = await this.getUserInvitations(user);

    return contributorRoles;
  }

  async getOrganizationRoles(
    membershipData: RolesOrganizationInput
  ): Promise<ContributorRoles> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(
        membershipData.organizationID
      );
    const allowedVisibilities = this.spaceFilterService.getAllowedVisibilities(
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
    spaceVisibilities: SpaceVisibility[]
  ): Promise<ContributorRoles> {
    const membership = new ContributorRoles();

    membership.id = contributorID;

    const maps = await mapCredentialsToRoles(
      this.entityManager,
      credentials,
      spaceVisibilities
    );
    membership.spaces = maps.spaces;
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
    const communityDisplayName =
      await this.communityResolverService.getDisplayNameForCommunityOrFail(
        community.id,
        community.type
      );
    const applicationResult = new ApplicationForRoleResult(
      community.id,
      communityDisplayName,
      state,
      application.id,
      community.spaceID,
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

  private async getUserInvitations(
    user: IUser
  ): Promise<InvitationForRoleResult[]> {
    const invitationResults: InvitationForRoleResult[] = [];
    const invitations = await this.invitationService.findInvitationsForUser(
      user.id
    );

    if (!invitations) return [];

    for (const invitation of invitations) {
      // skip any finalized invitations; only want to return pending invitations
      const isFinalized = await this.invitationService.isFinalizedInvitation(
        invitation.id
      );
      if (isFinalized) continue;
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
    const invitationResult = new InvitationForRoleResult(
      community.id,
      communityDisplayName,
      state,
      invitation.welcomeMessage,
      invitation.id,
      community.spaceID,
      invitation.createdDate,
      invitation.updatedDate
    );

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
