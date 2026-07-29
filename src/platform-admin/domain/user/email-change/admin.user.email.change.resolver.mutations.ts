import { GLOBAL_POLICY_ADMIN_USER_EMAIL_CHANGE } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserEmailChangeResult } from '@domain/community/user-email-change/dto/user.email.change.result';
import {
  UserEmailChangeErrorCode,
  UserEmailChangeException,
} from '@domain/community/user-email-change/user.email.change.errors';
import { UserEmailChangeService } from '@domain/community/user-email-change/user.email.change.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { AdminUserEmailChangeDriftResolveInput } from './dto/admin.user.email.change.drift.resolve.dto.input';
import { AdminUserEmailChangeInput } from './dto/admin.user.email.change.dto.input';

@InstrumentResolver()
@Resolver()
export class AdminUserEmailChangeResolverMutations {
  /** 027-platform-role-redesign (sec-server-7 fix): A4's own pre-feature
   * reacher set {GA, GS, GLM} plus the new owning role, checked against
   * THIS resolver-local, hardcoded IN_MEMORY policy — NOT the shared
   * `getPlatformAuthorizationPolicy()`, whose PLATFORM_USERS_ADMIN grant
   * set is additively widened to also admit GLOBAL_PLATFORM_MANAGER, which
   * never held these two mutations' pre-feature PLATFORM_ADMIN gate.
   * Mirrors `accountDeletePolicy` in admin.users.resolver.mutations.ts. */
  private emailChangePolicy: IAuthorizationPolicy;

  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly userEmailChangeService: UserEmailChangeService
  ) {
    const policy = new AuthorizationPolicy(AuthorizationPolicyType.IN_MEMORY);
    const rule =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_USERS_ADMIN],
        [
          AuthorizationCredential.PLATFORM_USERS_ADMIN,
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
          AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
        ],
        GLOBAL_POLICY_ADMIN_USER_EMAIL_CHANGE
      );
    this.emailChangePolicy =
      this.authorizationPolicyService.appendCredentialAuthorizationRules(
        policy,
        [rule]
      );
  }

  @Mutation(() => UserEmailChangeResult, {
    description:
      "Change a user's login email synchronously, acting as a platform administrator. The admin is responsible for verifying the subject user's identity out-of-band — the platform does NOT send a confirmation message to the new mailbox and does NOT require the new mailbox to prove ownership. Validates uniqueness, commits Kratos → Alkemio with bounded retry, invalidates the subject's existing sessions, and sends a security-signal notification to the old address. Requires PLATFORM_USERS_ADMIN.",
  })
  async adminUserEmailChange(
    @CurrentActor() actorContext: ActorContext,
    @Args('adminUserEmailChangeData') input: AdminUserEmailChangeInput
  ): Promise<UserEmailChangeResult> {
    await this.assertPlatformAdmin(
      actorContext,
      `adminUserEmailChange subject=${input.userID}`
    );
    const result = await this.userEmailChangeService.applyAdminEmailChange(
      actorContext.actorID,
      input.userID,
      input.newEmail,
      input.reason,
      input.approver
    );
    return result;
  }

  @Mutation(() => UserEmailChangeResult, {
    description:
      'Reconcile an outstanding drift-detected state for a subject user by force-aligning Alkemio and Kratos to a canonical email chosen by the admin. Requires PLATFORM_USERS_ADMIN.',
  })
  async adminUserEmailChangeDriftResolve(
    @CurrentActor() actorContext: ActorContext,
    @Args('adminUserEmailChangeDriftResolveData')
    input: AdminUserEmailChangeDriftResolveInput
  ): Promise<UserEmailChangeResult> {
    await this.assertPlatformAdmin(
      actorContext,
      `adminUserEmailChangeDriftResolve subject=${input.userID}`
    );
    return this.userEmailChangeService.resolveDrift(
      actorContext.actorID,
      input.userID,
      input.canonicalEmail
    );
  }

  // 027-platform-role-redesign (T061, A4; sec-server-7 fix): checked
  // against the resolver-local `emailChangePolicy`, NOT the shared,
  // Slice-A-widened `getPlatformAuthorizationPolicy()` — that union also
  // admits GLOBAL_PLATFORM_MANAGER, which never held this surface's
  // pre-feature PLATFORM_ADMIN gate.
  private async assertPlatformAdmin(
    actorContext: ActorContext,
    description: string
  ): Promise<void> {
    try {
      this.authorizationService.grantAccessOrFail(
        actorContext,
        this.emailChangePolicy,
        AuthorizationPrivilege.PLATFORM_USERS_ADMIN,
        description
      );
    } catch {
      // Re-raise as the feature-scoped EMAIL_CHANGE_UNAUTHORIZED code per
      // contracts/graphql.md §6.
      throw new UserEmailChangeException(
        UserEmailChangeErrorCode.EMAIL_CHANGE_UNAUTHORIZED,
        'Caller lacks PLATFORM_USERS_ADMIN privilege for this email-change operation.',
        LogContext.AUTH,
        { actorID: actorContext.actorID }
      );
    }
  }
}
