import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { UserIdentityDeletionException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformUserRecordAuditService } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/** T063 — A5's declared owner/legacy-reachers (T062's grant). */
const A5_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_USERS_ADMIN,
];
const A5_LEGACY_REACHERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.GLOBAL_ADMIN,
  AuthorizationCredential.GLOBAL_SUPPORT,
  AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
  AuthorizationCredential.GLOBAL_PLATFORM_MANAGER,
];

@InstrumentResolver()
@Resolver()
export class AdminUsersMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private kratosService: KratosService,
    private userService: UserService,
    private readonly platformUserRecordAuditService: PlatformUserRecordAuditService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {}

  @Mutation(() => IUser, {
    description:
      'Remove the Kratos account associated with the specified User. Note: the Users profile on the platform is not deleted.',
  })
  async adminUserAccountDelete(
    @CurrentActor() actorContext: ActorContext,
    @Args('userID', { type: () => UUID }) userID: string
  ): Promise<IUser> {
    // 027-platform-role-redesign (T062, A5, research D5): re-anchored off
    // PLATFORM_ADMIN onto PLATFORM_USERS_ADMIN.
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      actorContext,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
      `Remove Kratos account for User ${userID}: ${actorContext.actorID}`
    );

    const user = await this.userService.getUserByIdOrFail(userID);
    try {
      await this.kratosService.deleteIdentityByEmail(user.email);
      const updatedUser =
        await this.userService.clearAuthenticationIDForUser(user);
      this.logger.verbose?.(
        `Account associated with User ${user.email} has been deleted and authentication ID cleared`,
        LogContext.AUTH
      );
      // T063 — single-path surface: every successful call is audited.
      await this.platformUserRecordAuditService.recordActionForActor(
        actorContext,
        A5_INTENDED_OWNERS,
        A5_LEGACY_REACHERS,
        {
          action: 'adminUserAccountDelete',
          targetUserId: user.id,
          outcome: 'account_reset',
        }
      );
      return updatedUser;
    } catch (error: any) {
      this.logger.error?.(
        `Failed to delete account for User ID ${userID}: ${error.message}`,
        LogContext.AUTH
      );
      throw new UserIdentityDeletionException('Failed to delete user account');
    }
  }
}
