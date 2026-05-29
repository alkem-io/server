import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserEmailChangeResult } from '@domain/community/user-email-change/dto/user.email.change.result';
import {
  UserEmailChangeErrorCode,
  UserEmailChangeException,
} from '@domain/community/user-email-change/user.email.change.errors';
import { UserEmailChangeService } from '@domain/community/user-email-change/user.email.change.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { AdminUserEmailChangeDriftResolveInput } from './dto/admin.user.email.change.drift.resolve.dto.input';
import { AdminUserEmailChangeInput } from './dto/admin.user.email.change.dto.input';

@InstrumentResolver()
@Resolver()
export class AdminUserEmailChangeResolverMutations {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private readonly userEmailChangeService: UserEmailChangeService
  ) {}

  @Mutation(() => UserEmailChangeResult, {
    description:
      "Change a user's login email synchronously, acting as a platform administrator. The admin is responsible for verifying the subject user's identity out-of-band — the platform does NOT send a confirmation message to the new mailbox and does NOT require the new mailbox to prove ownership. Validates uniqueness, commits Kratos → Alkemio with bounded retry, invalidates the subject's existing sessions, and sends a security-signal notification to the old address. Requires PLATFORM_ADMIN.",
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
      'Reconcile an outstanding drift-detected state for a subject user by force-aligning Alkemio and Kratos to a canonical email chosen by the admin. Requires PLATFORM_ADMIN.',
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

  private async assertPlatformAdmin(
    actorContext: ActorContext,
    description: string
  ): Promise<void> {
    try {
      this.authorizationService.grantAccessOrFail(
        actorContext,
        await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy(),
        AuthorizationPrivilege.PLATFORM_ADMIN,
        description
      );
    } catch {
      // Re-raise as the feature-scoped EMAIL_CHANGE_UNAUTHORIZED code per
      // contracts/graphql.md §6.
      throw new UserEmailChangeException(
        UserEmailChangeErrorCode.EMAIL_CHANGE_UNAUTHORIZED,
        'Caller lacks PLATFORM_ADMIN privilege for this email-change operation.',
        LogContext.AUTH,
        { actorID: actorContext.actorID }
      );
    }
  }
}
