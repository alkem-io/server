import { GLOBAL_POLICY_ADMIN_USER_ACCOUNT_DELETE } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { UserIdentityDeletionException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IUser } from '@domain/community/user/user.interface';
import { UserService } from '@domain/community/user/user.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformUserRecordAuditService } from '@src/platform-admin/platform-user-record-audit/platform.user.record.audit.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

/** T063 — A5's declared owner/legacy-reachers (T062's grant). */
const A5_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_USERS_ADMIN,
];
const A5_LEGACY_REACHERS: readonly AuthorizationCredential[] = [];

@InstrumentResolver()
@Resolver()
export class AdminUsersMutations {
  /** sec-server-4 fix: consolidating A4 (email change) and A5 (identity/
   * account deletion) onto ONE `PLATFORM_USERS_ADMIN` privilege whose grant
   * set is the UNION of both surfaces' prior legacy reachers would hand
   * `global-platform-manager` — who never held THIS surface's legacy
   * `PLATFORM_ADMIN` gate ({GLOBAL_ADMIN, GLOBAL_SUPPORT,
   * GLOBAL_LICENSE_MANAGER}) — irreversible account deletion. Checked
   * against THIS resolver-local, hardcoded policy instead of the shared,
   * widened platform policy. */
  private accountDeletePolicy: IAuthorizationPolicy;

  constructor(
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private kratosService: KratosService,
    private userService: UserService,
    private readonly platformUserRecordAuditService: PlatformUserRecordAuditService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private logger: LoggerService
  ) {
    const policy = new AuthorizationPolicy(AuthorizationPolicyType.IN_MEMORY);
    const rule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_USERS_ADMIN],
        [AuthorizationCredential.PLATFORM_USERS_ADMIN],
        GLOBAL_POLICY_ADMIN_USER_ACCOUNT_DELETE
      );
    this.accountDeletePolicy =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        policy,
        [rule]
      );
  }

  @Mutation(() => IUser, {
    description:
      'Remove the Kratos account associated with the specified User. Note: the Users profile on the platform is not deleted.',
  })
  async adminUserAccountDelete(
    @CurrentActor() actorContext: ActorContext,
    @Args('userID', { type: () => UUID }) userID: string
  ): Promise<IUser> {
    // 027-platform-role-redesign (T062, A5, research D5) — sec-server-4
    // fix: re-anchored off legacy PLATFORM_ADMIN onto PLATFORM_USERS_ADMIN
    // (the new owning role), checked against `accountDeletePolicy` — NOT
    // the shared platform policy, whose PLATFORM_USERS_ADMIN grant set is
    // additively widened to also admit global-platform-manager (A4's
    // legacy reacher), who never held THIS surface.
    this.authorizationService.grantAccessOrFail(
      actorContext,
      this.accountDeletePolicy,
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
