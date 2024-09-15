import { EntityManager } from 'typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { IApplication } from '@domain/community/application';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { RolesUserInput } from './dto/roles.dto.input.user';
import { ContributorRoles } from './dto/roles.dto.result.contributor';
import { CommunityApplicationForRoleResult } from './dto/roles.dto.result.community.application';
import { RolesOrganizationInput } from './dto/roles.dto.input.organization';
import { mapSpaceCredentialsToRoles } from './util/map.space.credentials.to.roles';
import { CommunityInvitationForRoleResult } from './dto/roles.dto.result.community.invitation';
import { InvitationService } from '@domain/community/invitation/invitation.service';
import { IInvitation } from '@domain/community/invitation';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RolesResultOrganization } from './dto/roles.dto.result.organization';
import { mapOrganizationCredentialsToRoles } from './util/map.organization.credentials.to.roles';
import { RolesResultSpace } from './dto/roles.dto.result.space';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { RolesVirtualContributorInput } from './dto/roles.dto.input.virtual.contributor';
import { IRoleManager } from '@domain/access/role-manager';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';

export class RolesService {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    private userService: UserService,
    private virtualContributorService: VirtualContributorService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private spaceFilterService: SpaceFilterService,
    private communityResolverService: CommunityResolverService,
    private authorizationService: AuthorizationService,
    private organizationService: OrganizationService,
    private userLookupService: ContributorLookupService,
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

  async getRolesForVirtualContributor(
    membershipData: RolesVirtualContributorInput
  ): Promise<ContributorRoles> {
    const contributorRoles = new ContributorRoles();
    const vc =
      await this.virtualContributorService.getVirtualContributorAndAgent(
        membershipData.virtualContributorID
      );

    contributorRoles.id = membershipData.virtualContributorID;
    contributorRoles.credentials = vc.agent?.credentials || [];

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

  public async getSpaceRolesForContributor(
    roles: ContributorRoles,
    agentInfo: AgentInfo
  ): Promise<RolesResultSpace[]> {
    const allowedVisibilities = this.spaceFilterService.getAllowedVisibilities(
      roles.filter
    );

    return await mapSpaceCredentialsToRoles(
      this.entityManager,
      roles.credentials,
      allowedVisibilities,
      agentInfo,
      this.authorizationService
    );
  }

  public async getCommunityApplicationsForUser(
    userID: string,
    states?: string[]
  ): Promise<IApplication[]> {
    return await this.applicationService.findApplicationsForUser(
      userID,
      states
    );
  }

  public async convertApplicationsToRoleResults(
    applications: IApplication[]
  ): Promise<CommunityApplicationForRoleResult[]> {
    const applicationResults: CommunityApplicationForRoleResult[] = [];
    for (const application of applications) {
      const roleManager = application.roleManager;
      const state = await this.applicationService.getApplicationState(
        application.id
      );
      if (roleManager) {
        const applicationResult =
          await this.buildApplicationResultForRoleManagerApplication(
            roleManager,
            state,
            application
          );

        applicationResults.push(applicationResult);
      }
    }
    return applicationResults;
  }

  private async buildApplicationResultForRoleManagerApplication(
    roleManager: IRoleManager,
    state: string,
    application: IApplication
  ): Promise<CommunityApplicationForRoleResult> {
    const roleManagerDisplayName =
      await this.communityResolverService.getDisplayNameForRoleManagerOrFail(
        roleManager.id
      );

    const space =
      await this.communityResolverService.getSpaceForRoleManagerOrFail(
        roleManager.id
      );

    const applicationResult = new CommunityApplicationForRoleResult(
      roleManager.id,
      roleManagerDisplayName,
      state,
      application.id,
      space.id,
      space.level,
      application.createdDate,
      application.updatedDate
    );

    return applicationResult;
  }

  public async getCommunityInvitationsForUser(
    userID: string,
    states?: string[]
  ): Promise<IInvitation[]> {
    // What contributors are managed by this user?
    const contributorsManagedByUser =
      await this.userLookupService.getContributorsManagedByUser(userID);
    const invitations: IInvitation[] = [];
    for (const contributor of contributorsManagedByUser) {
      const contributorInvitations =
        await this.invitationService.findInvitationsForContributor(
          contributor.id,
          states
        );
      if (contributorInvitations) {
        invitations.push(...contributorInvitations);
      }
    }

    return invitations;
  }

  public async convertInvitationsToRoleResults(
    invitations: IInvitation[]
  ): Promise<CommunityInvitationForRoleResult[]> {
    const invitationResults: CommunityInvitationForRoleResult[] = [];
    for (const invitation of invitations) {
      const roleManager = invitation.roleManager;
      const state = await this.invitationService.getInvitationState(
        invitation.id
      );
      if (roleManager) {
        const invitationResult =
          await this.buildInvitationResultForRoleManagerInvitation(
            roleManager,
            state,
            invitation
          );

        invitationResults.push(invitationResult);
      }
    }
    return invitationResults;
  }

  private async buildInvitationResultForRoleManagerInvitation(
    roleManager: IRoleManager,
    state: string,
    invitation: IInvitation
  ): Promise<CommunityInvitationForRoleResult> {
    const communityDisplayName =
      await this.communityResolverService.getDisplayNameForRoleManagerOrFail(
        roleManager.id
      );

    const space =
      await this.communityResolverService.getSpaceForRoleManagerOrFail(
        roleManager.id
      );

    const invitationResult = new CommunityInvitationForRoleResult(
      roleManager.id,
      communityDisplayName,
      state,
      invitation.id,
      space.id,
      space.level,
      invitation.createdDate,
      invitation.updatedDate
    );
    invitationResult.contributorID = invitation.invitedContributor;
    invitationResult.contributorType = invitation.contributorType;

    invitationResult.createdBy = invitation.createdBy ?? '';
    invitationResult.welcomeMessage = invitation.welcomeMessage;

    return invitationResult;
  }
}
