import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IApplication } from '@domain/access/application';
import { ApplicationService } from '@domain/access/application/application.service';
import { IInvitation } from '@domain/access/invitation';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { IRoleSet } from '@domain/access/role-set';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { ContributorLookupService } from '@services/infrastructure/contributor-lookup/contributor.lookup.service';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { RolesOrganizationInput } from './dto/roles.dto.input.organization';
import { RolesUserInput } from './dto/roles.dto.input.user';
import { RolesVirtualContributorInput } from './dto/roles.dto.input.virtual.contributor';
import { CommunityApplicationForRoleResult } from './dto/roles.dto.result.community.application';
import { CommunityInvitationForRoleResult } from './dto/roles.dto.result.community.invitation';
import { ContributorRoles } from './dto/roles.dto.result.contributor';
import { RolesResultOrganization } from './dto/roles.dto.result.organization';
import { RolesResultSpace } from './dto/roles.dto.result.space';
import { mapOrganizationCredentialsToRoles } from './util/map.organization.credentials.to.roles';
import { mapSpaceCredentialsToRoles } from './util/map.space.credentials.to.roles';

export class RolesService {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    private userLookupService: UserLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private spaceFilterService: SpaceFilterService,
    private communityResolverService: CommunityResolverService,
    private authorizationService: AuthorizationService,
    private organizationLookupService: OrganizationLookupService,
    private contributorLookupService: ContributorLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getRolesForUser(
    membershipData: RolesUserInput
  ): Promise<ContributorRoles> {
    const contributorRoles = new ContributorRoles();
    const user = await this.userLookupService.getUserWithAgent(
      membershipData.userID
    );

    contributorRoles.id = membershipData.userID;
    contributorRoles.filter = membershipData.filter;
    contributorRoles.credentials = user.agent?.credentials || [];

    return contributorRoles;
  }

  async getRolesForOrganization(
    membershipData: RolesOrganizationInput
  ): Promise<ContributorRoles> {
    const contributorRoles = new ContributorRoles();

    const { agent } =
      await this.organizationLookupService.getOrganizationAndAgent(
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
      await this.virtualContributorLookupService.getVirtualContributorAndAgent(
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

    return mapSpaceCredentialsToRoles(
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
      const roleSet = application.roleSet;
      const state = await this.applicationService.getLifecycleState(
        application.id
      );
      if (roleSet) {
        const applicationResult =
          await this.buildApplicationResultForRoleSetApplication(
            roleSet,
            state,
            application
          );

        applicationResults.push(applicationResult);
      }
    }
    return applicationResults;
  }

  private async buildApplicationResultForRoleSetApplication(
    roleSet: IRoleSet,
    state: string,
    application: IApplication
  ): Promise<CommunityApplicationForRoleResult> {
    const roleSetDisplayName =
      await this.communityResolverService.getDisplayNameForRoleSetOrFail(
        roleSet.id
      );

    const space = await this.communityResolverService.getSpaceForRoleSetOrFail(
      roleSet.id
    );

    const applicationResult = new CommunityApplicationForRoleResult(
      roleSet.id,
      roleSetDisplayName,
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
      await this.contributorLookupService.getContributorsManagedByUser(userID);
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
      const roleSet = invitation.roleSet;
      const state = await this.invitationService.getLifecycleState(
        invitation.id
      );
      if (roleSet) {
        const invitationResult =
          await this.buildInvitationResultForRoleSetInvitation(
            roleSet,
            state,
            invitation
          );

        invitationResults.push(invitationResult);
      }
    }
    return invitationResults;
  }

  private async buildInvitationResultForRoleSetInvitation(
    roleSet: IRoleSet,
    state: string,
    invitation: IInvitation
  ): Promise<CommunityInvitationForRoleResult> {
    const communityDisplayName =
      await this.communityResolverService.getDisplayNameForRoleSetOrFail(
        roleSet.id
      );

    const space = await this.communityResolverService.getSpaceForRoleSetOrFail(
      roleSet.id
    );

    const invitationResult = new CommunityInvitationForRoleResult(
      roleSet.id,
      communityDisplayName,
      state,
      invitation.id,
      space.id,
      space.level,
      invitation.createdDate,
      invitation.updatedDate
    );
    invitationResult.contributorID = invitation.invitedContributorID;
    invitationResult.contributorType = invitation.contributorType;

    invitationResult.createdBy = invitation.createdBy ?? '';
    invitationResult.welcomeMessage = invitation.welcomeMessage;

    return invitationResult;
  }
}
