import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IApplication } from '@domain/access/application';
import { ApplicationService } from '@domain/access/application/application.service';
import { IInvitation } from '@domain/access/invitation';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { IRoleSet } from '@domain/access/role-set';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import {
  RolesOrganizationInput,
  RolesUserInput,
  RolesVirtualContributorInput,
} from './dto/roles.dto.input.actor';
import { ActorRoles } from './dto/roles.dto.result.actor';
import { CommunityApplicationForRoleResult } from './dto/roles.dto.result.community.application';
import { CommunityInvitationForRoleResult } from './dto/roles.dto.result.community.invitation';
import { RolesResultOrganization } from './dto/roles.dto.result.organization';
import { RolesResultSpace } from './dto/roles.dto.result.space';
import { mapOrganizationCredentialsToRoles } from './util/map.organization.credentials.to.roles';
import { mapSpaceCredentialsToRoles } from './util/map.space.credentials.to.roles';

export class RolesService {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private spaceFilterService: SpaceFilterService,
    private communityResolverService: CommunityResolverService,
    private authorizationService: AuthorizationService,
    private actorLookupService: ActorLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getRolesForUser(membershipData: RolesUserInput): Promise<ActorRoles> {
    const contributorRoles = new ActorRoles();
    contributorRoles.id = membershipData.actorID;
    contributorRoles.filter = membershipData.filter;
    contributorRoles.credentials =
      await this.actorLookupService.getActorCredentialsOrFail(
        membershipData.actorID
      );

    return contributorRoles;
  }

  async getRolesForOrganization(
    membershipData: RolesOrganizationInput
  ): Promise<ActorRoles> {
    const contributorRoles = new ActorRoles();
    contributorRoles.id = membershipData.actorID;
    contributorRoles.filter = membershipData.filter;
    contributorRoles.credentials =
      await this.actorLookupService.getActorCredentialsOrFail(
        membershipData.actorID
      );

    return contributorRoles;
  }

  async getRolesForVirtualContributor(
    membershipData: RolesVirtualContributorInput
  ): Promise<ActorRoles> {
    const contributorRoles = new ActorRoles();
    contributorRoles.id = membershipData.actorID;
    contributorRoles.credentials =
      await this.actorLookupService.getActorCredentialsOrFail(
        membershipData.actorID
      );

    return contributorRoles;
  }

  async getOrganizationRolesForUser(
    roles: ActorRoles
  ): Promise<RolesResultOrganization[]> {
    return await mapOrganizationCredentialsToRoles(
      this.entityManager,
      roles.credentials
    );
  }

  public async getSpaceRolesForContributor(
    roles: ActorRoles,
    actorContext: ActorContext
  ): Promise<RolesResultSpace[]> {
    const allowedVisibilities = this.spaceFilterService.getAllowedVisibilities(
      roles.filter
    );

    return mapSpaceCredentialsToRoles(
      this.entityManager,
      roles.credentials,
      allowedVisibilities,
      actorContext,
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
      await this.actorLookupService.getActorsManagedByUser(userID);
    const invitations: IInvitation[] = [];
    for (const contributor of contributorsManagedByUser) {
      const contributorInvitations =
        await this.invitationService.findInvitationsForActor(
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
    invitationResult.actorID = invitation.invitedActorID;
    invitationResult.createdBy = invitation.createdBy ?? '';
    invitationResult.welcomeMessage = invitation.welcomeMessage;

    return invitationResult;
  }
}
