import { JoinRuleInvite, JoinRulePublic } from '@alkemio/matrix-adapter-lib';
import { GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT } from '@common/constants/authorization/global.policy.constants';
import { CurrentActor, Profiling } from '@common/decorators';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CommunicationRoomResult } from '@services/adapters/communication-adapter/dto/communication.dto.room.result';
import { InstrumentResolver } from '@src/apm/decorators';
import { AdminCommunicationService } from './admin.communication.service';
import { AdminCommunicationSpaceSyncService } from './admin.communication.space.sync.service';
import { CommunicationAdminEnsureAccessInput } from './dto/admin.communication.dto.ensure.access.input';
import { CommunicationAdminMigrateRoomsResult } from './dto/admin.communication.dto.migrate.rooms.result';
import { CommunicationAdminRemoveOrphanedRoomInput } from './dto/admin.communication.dto.remove.orphaned.room';
import { CommunicationAdminUpdateRoomStateInput } from './dto/admin.communication.dto.update.room.state';

@InstrumentResolver()
@Resolver()
export class AdminCommunicationResolverMutations {
  private communicationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private adminCommunicationService: AdminCommunicationService,
    private adminCommunicationSpaceSyncService: AdminCommunicationSpaceSyncService
  ) {
    // Synthetic, in-memory policy — built once at construction, never
    // persisted and never touched by an authorization reset. It exists so the
    // messaging-platform maintenance mutations below can be gated on a
    // deliberately NARROWER role set than the platform authorization policy.
    //
    // Grant set: GLOBAL_ADMIN (historic, pre-dates the Platform Operations
    // Admin role) + PLATFORM_OPERATIONS_ADMIN (added by workspace#019) — and
    // deliberately NOTHING else. Every other global role, GLOBAL_SUPPORT
    // included, is EXCLUDED: they hold PLATFORM_ADMIN /
    // PLATFORM_OPERATIONS_ADMIN on the platform policy, but have never been
    // able to run these mutations, which act directly on Matrix rooms across
    // every Space. Swapping in the platform authorization policy would widen
    // access to those broader credentials (GLOBAL_LICENSE_MANAGER among them —
    // note it is not an AuthorizationRoleGlobal, so it cannot even be named in
    // this synthetic policy's role list).
    //
    // This is why the gate is COMMUNICATION_ADMIN and not
    // PLATFORM_OPERATIONS_ADMIN: reusing the platform-wide privilege name here
    // would give one enum value two different grant sets depending on which
    // policy object reached grantAccessOrFail, and the next person to gate a
    // mutation on the platform policy would silently widen comms access to
    // GS/GLM. Widening this set is a product decision — make it explicitly,
    // here, not by accident elsewhere.
    //
    // Covered by admin.communication.resolver.mutations.spec.ts — see the
    // 'authorization policy' describe block.
    this.communicationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [
          AuthorizationRoleGlobal.GLOBAL_ADMIN,
          AuthorizationRoleGlobal.PLATFORM_OPERATIONS_ADMIN,
        ],
        [AuthorizationPrivilege.COMMUNICATION_ADMIN],
        GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT
      );
  }

  @Mutation(() => Boolean, {
    description:
      'Ensure all community members are registered for communications.',
  })
  @Profiling.api
  async adminCommunicationEnsureAccessToCommunications(
    @Args('communicationData')
    ensureAccessData: CommunicationAdminEnsureAccessInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      this.communicationGlobalAdminPolicy,
      AuthorizationPrivilege.COMMUNICATION_ADMIN,
      'grant community members access to communications'
    );
    return await this.adminCommunicationService.ensureCommunityAccessToCommunications(
      ensureAccessData
    );
  }

  @Mutation(() => Boolean, {
    description: 'Remove an orphaned room from messaging platform.',
  })
  @Profiling.api
  async adminCommunicationRemoveOrphanedRoom(
    @Args('orphanedRoomData')
    orphanedRoomData: CommunicationAdminRemoveOrphanedRoomInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      this.communicationGlobalAdminPolicy,
      AuthorizationPrivilege.COMMUNICATION_ADMIN,
      'communications admin remove orphaned room'
    );
    return await this.adminCommunicationService.removeOrphanedRoom(
      orphanedRoomData
    );
  }

  @Mutation(() => Boolean, {
    description: 'Allow updating the state flags of a particular rule.',
  })
  @Profiling.api
  async adminCommunicationUpdateRoomState(
    @Args('roomStateData')
    roomStateData: CommunicationAdminUpdateRoomStateInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<CommunicationRoomResult> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      this.communicationGlobalAdminPolicy,
      AuthorizationPrivilege.COMMUNICATION_ADMIN,
      'communications admin update join rule on all rooms'
    );
    return await this.adminCommunicationService.updateRoomState(
      roomStateData.roomID,
      roomStateData.isPublic ? JoinRulePublic : JoinRuleInvite,
      roomStateData.isWorldVisible
    );
  }

  @Mutation(() => CommunicationAdminMigrateRoomsResult, {
    description:
      'Create rooms for legacy conversations that were created without one (from lazy room creation era).',
  })
  @Profiling.api
  async adminCommunicationMigrateOrphanedConversations(
    @CurrentActor() actorContext: ActorContext
  ): Promise<CommunicationAdminMigrateRoomsResult> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      this.communicationGlobalAdminPolicy,
      AuthorizationPrivilege.COMMUNICATION_ADMIN,
      'communications admin migrate orphaned conversations'
    );
    return await this.adminCommunicationService.migrateConversationRooms();
  }

  @Mutation(() => Boolean, {
    description:
      'Synchronize all Alkemio spaces into the Matrix space hierarchy. Idempotent — safe to call multiple times.',
  })
  @Profiling.api
  async adminCommunicationSyncSpaceHierarchy(
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      this.communicationGlobalAdminPolicy,
      AuthorizationPrivilege.COMMUNICATION_ADMIN,
      'communications admin sync space hierarchy'
    );
    return await this.adminCommunicationSpaceSyncService.syncSpaceHierarchy();
  }
}
