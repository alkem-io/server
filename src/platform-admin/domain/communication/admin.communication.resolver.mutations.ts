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
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
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
    private adminCommunicationSpaceSyncService: AdminCommunicationSpaceSyncService,
    private platformOperationsAuditService: PlatformOperationsAuditService
  ) {
    // Synthetic, in-memory policy — built once at construction, never
    // persisted and never touched by an authorization reset. It gates the
    // messaging-platform maintenance mutations below on a deliberately
    // NARROWER role set than the platform authorization policy: GLOBAL_ADMIN
    // (historic holder) + PLATFORM_OPERATIONS_ADMIN. Every other global role,
    // GLOBAL_SUPPORT included, stays excluded — these mutations act directly
    // on Matrix rooms across every Space.
    //
    // GRANT and PLATFORM_ADMIN are retained in the privilege set so
    // GLOBAL_ADMIN's develop-era grants on this policy are preserved verbatim;
    // the resolver gates themselves check PLATFORM_OPERATIONS_ADMIN. The
    // privilege is granted here on this synthetic policy only — holders gain
    // nothing on the platform policy through this rule.
    //
    // Covered by admin.communication.resolver.mutations.spec.ts — see the
    // 'authorization policy' describe block.
    this.communicationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [
          AuthorizationRoleGlobal.GLOBAL_ADMIN,
          AuthorizationRoleGlobal.PLATFORM_OPERATIONS_ADMIN,
        ],
        [
          AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.PLATFORM_ADMIN,
        ],
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
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      `grant community members access to communications: ${actorContext.actorID}`
    );
    try {
      const result =
        await this.adminCommunicationService.ensureCommunityAccessToCommunications(
          ensureAccessData
        );
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminCommunicationEnsureAccessToCommunications',
        target: { communityID: ensureAccessData.communityID },
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminCommunicationEnsureAccessToCommunications',
        target: { communityID: ensureAccessData.communityID },
        outcome: 'failure',
        error,
      });
      throw error;
    }
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
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      `communications admin remove orphaned room: ${actorContext.actorID}`
    );
    try {
      const result =
        await this.adminCommunicationService.removeOrphanedRoom(
          orphanedRoomData
        );
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminCommunicationRemoveOrphanedRoom',
        target: { roomID: orphanedRoomData.roomID },
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminCommunicationRemoveOrphanedRoom',
        target: { roomID: orphanedRoomData.roomID },
        outcome: 'failure',
        error,
      });
      throw error;
    }
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
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      `communications admin update join rule on all rooms: ${actorContext.actorID}`
    );
    try {
      const result = await this.adminCommunicationService.updateRoomState(
        roomStateData.roomID,
        roomStateData.isPublic ? JoinRulePublic : JoinRuleInvite,
        roomStateData.isWorldVisible
      );
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminCommunicationUpdateRoomState',
        target: {
          roomID: roomStateData.roomID,
          isPublic: roomStateData.isPublic,
          isWorldVisible: roomStateData.isWorldVisible,
        },
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminCommunicationUpdateRoomState',
        target: {
          roomID: roomStateData.roomID,
          isPublic: roomStateData.isPublic,
          isWorldVisible: roomStateData.isWorldVisible,
        },
        outcome: 'failure',
        error,
      });
      throw error;
    }
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
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      `communications admin migrate orphaned conversations: ${actorContext.actorID}`
    );
    try {
      const result =
        await this.adminCommunicationService.migrateConversationRooms();
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminCommunicationMigrateOrphanedConversations',
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminCommunicationMigrateOrphanedConversations',
        outcome: 'failure',
        error,
      });
      throw error;
    }
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
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      'communications admin sync space hierarchy'
    );
    try {
      const result =
        await this.adminCommunicationSpaceSyncService.syncSpaceHierarchy();
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminCommunicationSyncSpaceHierarchy',
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'adminCommunicationSyncSpaceHierarchy',
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }
}
