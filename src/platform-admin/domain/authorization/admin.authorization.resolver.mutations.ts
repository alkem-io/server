import { RoleChangeType } from '@alkemio/notifications-lib';
import { GLOBAL_POLICY_AUTHORIZATION_GRANT_GLOBAL_ADMIN } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { SpaceLevel } from '@common/enums/space.level';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { IOrganization } from '@domain/community/organization';
import { IUser } from '@domain/community/user/user.interface';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { Space } from '@domain/space/space/space.entity';
import { SpaceService } from '@domain/space/space/space.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InjectEntityManager } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationInputPlatformGlobalRoleChange } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.global.role.change';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { AuthResetService } from '@services/auth-reset/publisher/auth-reset.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor, Profiling } from '@src/common/decorators';
import { PlatformOperationsAuditService } from '@src/platform-admin/platform-operations-audit/platform.operations.audit.service';
import { EntityManager } from 'typeorm';
import { AdminAuthorizationService } from './admin.authorization.service';
import { GrantAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant';
import { GrantOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant.organization';
import { RevokeAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke';
import { RevokeOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke.organization';

@InstrumentResolver()
@Resolver()
export class AdminAuthorizationResolverMutations {
  private authorizationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private authorizationService: AuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private authResetService: AuthResetService,
    private virtualContributorService: VirtualContributorService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private spaceService: SpaceService,
    private platformOperationsAuditService: PlatformOperationsAuditService
  ) {
    // 027-platform-role-redesign (T034a, research C10/D24, thirteenth
    // analyze pass): this is the FR-022 pin, already structural. The four
    // mutations below (grant/revokeCredentialTo{User,Organization}) check
    // against THIS resolver-local, hardcoded IN_MEMORY policy — built once,
    // from a fixed one-element `[GLOBAL_ADMIN]` array — rather than against
    // the shared platform authorization policy's GRANT_GLOBAL_ADMINS
    // credential rule that platform.service.authorization.ts (T034)
    // widens to platform-roles-admin. Widening that shared rule therefore
    // cannot reach these four: they are not a second assignment surface
    // gated by the same widened privilege, they are gated by a wholly
    // separate, deliberately un-widened policy object. Do NOT "simplify"
    // this by replacing it with `platformAuthorizationPolicyService
    // .getPlatformAuthorizationPolicy()` — that IS the widened policy, and
    // doing so would open exactly the hole T034a exists to keep closed.
    // Verified by admin.authorization.resolver.mutations.spec.ts's
    // "FR-022 pin" suite using real AuthorizationPolicyService/
    // AuthorizationService instances. Deleted alongside these four
    // mutations at T080 (Slice B, FR-022).
    this.authorizationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.GRANT_GLOBAL_ADMINS],
        GLOBAL_POLICY_AUTHORIZATION_GRANT_GLOBAL_ADMIN
      );
  }

  @Mutation(() => IUser, {
    description: 'Grants an authorization credential to a User.',
  })
  async grantCredentialToUser(
    @Args('grantCredentialData')
    grantCredentialData: GrantAuthorizationCredentialInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IUser> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `grant credential: ${actorContext.actorID}`
    );

    const user =
      await this.adminAuthorizationService.grantCredentialToUser(
        grantCredentialData
      );

    // Send the notification
    this.notifyPlatformGlobalRoleChange(
      actorContext.actorID,
      user,
      RoleChangeType.ADDED,
      grantCredentialData.type
    );
    return user;
  }

  @Mutation(() => IUser, {
    description: 'Removes an authorization credential from a User.',
  })
  @Profiling.api
  async revokeCredentialFromUser(
    @Args('revokeCredentialData')
    credentialRemoveData: RevokeAuthorizationCredentialInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `revoke credential: ${actorContext.actorID}`
    );
    const user =
      await this.adminAuthorizationService.revokeCredentialFromUser(
        credentialRemoveData
      );
    this.notifyPlatformGlobalRoleChange(
      actorContext.actorID,
      user,
      RoleChangeType.REMOVED,
      credentialRemoveData.type
    );
    return user;
  }

  @Mutation(() => IOrganization, {
    description: 'Grants an authorization credential to an Organization.',
  })
  @Profiling.api
  async grantCredentialToOrganization(
    @Args('grantCredentialData')
    grantCredentialData: GrantOrganizationAuthorizationCredentialInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IOrganization> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `grant credential: ${actorContext.actorID}`
    );
    return await this.adminAuthorizationService.grantCredentialToOrganization(
      grantCredentialData
    );
  }

  @Mutation(() => IOrganization, {
    description: 'Removes an authorization credential from an Organization.',
  })
  @Profiling.api
  async revokeCredentialFromOrganization(
    @Args('revokeCredentialData')
    credentialRemoveData: RevokeOrganizationAuthorizationCredentialInput,
    @CurrentActor() actorContext: ActorContext
  ): Promise<IOrganization> {
    await this.authorizationService.grantAccessOrFail(
      actorContext,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `revoke credential: ${actorContext.actorID}`
    );
    return await this.adminAuthorizationService.revokeCredentialFromOrganization(
      credentialRemoveData
    );
  }

  @Mutation(() => String, {
    description: 'Reset the Authorization Policy on all entities',
  })
  public async authorizationPolicyResetAll(
    @CurrentActor() actorContext: ActorContext
  ): Promise<string> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization on platform`
    );

    try {
      const result = await this.authResetService.publishResetAll();
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPolicyResetAll',
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPolicyResetAll',
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  @Mutation(() => Boolean, {
    description:
      'Ensure all access privileges for the platform roles are re-calculated',
  })
  public async authorizationPlatformRolesAccessReset(
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset platformRolesAccess on all Spaces`
    );

    try {
      const spaces = await this.entityManager.find(Space, {
        where: {
          level: SpaceLevel.L0,
        },
      });
      for (const space of spaces) {
        await this.spaceService.updatePlatformRolesAccessRecursively(space);
      }
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPlatformRolesAccessReset',
        outcome: 'success',
      });
      return true;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPlatformRolesAccessReset',
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  @Mutation(() => IAuthorizationPolicy, {
    description:
      'Reset the specified Authorization Policy to global admin privileges',
  })
  public async authorizationPolicyResetToGlobalAdminsAccess(
    @CurrentActor() actorContext: ActorContext,
    @Args('authorizationID') authorizationID: string
  ): Promise<IAuthorizationPolicy> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    const platformPolicyUpdated =
      this.adminAuthorizationService.extendAuthorizationPolicyWithAuthorizationReset(
        platformPolicy
      );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicyUpdated,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization on a single authorization policy`
    );

    try {
      const result =
        await this.adminAuthorizationService.resetAuthorizationPolicy(
          authorizationID
        );
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPolicyResetToGlobalAdminsAccess',
        target: { authorizationID },
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'authorizationPolicyResetToGlobalAdminsAccess',
        target: { authorizationID },
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  @Mutation(() => Boolean, {
    description: 'Refresh the Bodies of Knowledge on All VCs',
  })
  public async refreshAllBodiesOfKnowledge(
    @CurrentActor() actorContext: ActorContext
  ): Promise<boolean> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN,
      `refresh all bodies of knowledge`
    );

    try {
      const result =
        await this.virtualContributorService.refreshAllBodiesOfKnowledge(
          actorContext
        );
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'refreshAllBodiesOfKnowledge',
        outcome: 'success',
      });
      return result;
    } catch (error) {
      await this.platformOperationsAuditService.recordOperation({
        actorID: actorContext.actorID,
        action: 'refreshAllBodiesOfKnowledge',
        outcome: 'failure',
        error,
      });
      throw error;
    }
  }

  private async notifyPlatformGlobalRoleChange(
    triggeredBy: string,
    user: IUser,
    type: RoleChangeType,
    role: string
  ) {
    const notificationInput: NotificationInputPlatformGlobalRoleChange = {
      triggeredBy,
      userID: user.id,
      type: type,
      role: role,
    };
    await this.notificationPlatformAdapter.platformGlobalRoleChanged(
      notificationInput
    );
  }
}
