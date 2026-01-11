import { EntityManager } from 'typeorm';
import { Inject, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ApplicationService } from '@domain/access/application/application.service';
import { IApplication } from '@domain/access/application';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { ActorRoles } from './dto/roles.dto.result.actor';
import { CommunityApplicationForRoleResult } from './dto/roles.dto.result.community.application';
import { RolesActorInput } from './dto/roles.dto.input.actor';
import { mapSpaceCredentialsToRoles } from './util/map.space.credentials.to.roles';
import { CommunityInvitationForRoleResult } from './dto/roles.dto.result.community.invitation';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { IInvitation } from '@domain/access/invitation';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RolesResultOrganization } from './dto/roles.dto.result.organization';
import { mapOrganizationCredentialsToRoles } from './util/map.organization.credentials.to.roles';
import { RolesResultSpace } from './dto/roles.dto.result.space';
import { ActorContext } from '@core/actor-context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { IRoleSet } from '@domain/access/role-set';

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

  async getRolesForActor(membershipData: RolesActorInput): Promise<ActorRoles> {
    const actor = await this.actorLookupService.getActorByIdOrFail(
      membershipData.actorId,
      { relations: { credentials: true } }
    );

    const actorRoles = new ActorRoles();
    actorRoles.id = membershipData.actorId;
    actorRoles.filter = membershipData.filter;
    actorRoles.credentials = actor.credentials || [];

    return actorRoles;
  }

  async getOrganizationRoles(
    roles: ActorRoles
  ): Promise<RolesResultOrganization[]> {
    return await mapOrganizationCredentialsToRoles(
      this.entityManager,
      roles.credentials
    );
  }

  public async getSpaceRoles(
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
    // What actors are managed by this user?
    const actorsManagedByUser =
      await this.actorLookupService.getActorsManagedByUser(userID);
    const invitations: IInvitation[] = [];
    for (const actor of actorsManagedByUser) {
      const actorInvitations = await this.invitationService.findInvitationsForActor(
        actor.id,
        states
      );
      if (actorInvitations) {
        invitations.push(...actorInvitations);
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
    invitationResult.actorId = invitation.invitedActorId;

    // Derive actor type from the invited contributor
    invitationResult.actorType =
      await this.actorLookupService.getActorTypeByIdOrFail(
        invitation.invitedActorId
      );

    invitationResult.createdBy = invitation.createdBy ?? '';
    invitationResult.welcomeMessage = invitation.welcomeMessage;

    return invitationResult;
  }
}
