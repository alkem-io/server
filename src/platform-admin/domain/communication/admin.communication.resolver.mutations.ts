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
    private adminCommunicationService: AdminCommunicationService
  ) {
    this.communicationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.GRANT, AuthorizationPrivilege.PLATFORM_ADMIN],
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
      AuthorizationPrivilege.GRANT,
      `grant community members access to communications: ${actorContext.actorID}`
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
      AuthorizationPrivilege.GRANT,
      `communications admin remove orphaned room: ${actorContext.actorID}`
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
      AuthorizationPrivilege.GRANT,
      `communications admin update join rule on all rooms: ${actorContext.actorID}`
    );
    return await this.adminCommunicationService.updateRoomState(
      roomStateData.roomID,
      roomStateData.isWorldVisible,
      roomStateData.isPublic
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
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `communications admin migrate orphaned conversations: ${actorContext.actorID}`
    );
    return await this.adminCommunicationService.migrateConversationRooms();
  }
}
