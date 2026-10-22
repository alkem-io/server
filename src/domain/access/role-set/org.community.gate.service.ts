import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { Injectable } from '@nestjs/common';

/**
 * Which path admitted an organization Community-tab action: the gate's own
 * base privilege (the organization's admins and owners) or Platform Support's
 * dedicated membership privilege. The branch is the ONLY input to auditing —
 * only `platform-support` calls write an `organization_administration` row.
 */
export type OrgCommunityBranch = 'entity-admin' | 'platform-support';

export const SELF_TARGET_REFUSAL_REASON =
  'self-targeted platform-support action is not allowed';

/**
 * The single gate every organization Community-tab action passes through.
 *
 * The entity-admin path is evaluated first, so an actor who is both an
 * organization admin and Platform Support acts as the admin: no audit row, and
 * the self-target refusal does not apply. The Support path is admitted by
 * `PLATFORM_SUPPORT_ORG_MEMBERSHIP`, which only organization role sets (and
 * their invitations and applications) grant — on any other policy it simply
 * never admits, so the helper needs no role-set type check.
 *
 * The helper evaluates the policy it is given and nothing else: it writes no
 * audit rows and looks up no roles.
 */
@Injectable()
export class OrgCommunityGateService {
  constructor(private readonly authorizationService: AuthorizationService) {}

  /** Non-throwing form, for lifecycle guards and attribution. `undefined`
   * means neither path admits. */
  resolveBranch(
    actorContext: ActorContext,
    authorization: IAuthorizationPolicy | undefined,
    basePrivilege: AuthorizationPrivilege
  ): OrgCommunityBranch | undefined {
    if (
      this.authorizationService.isAccessGranted(
        actorContext,
        authorization,
        basePrivilege
      )
    ) {
      return 'entity-admin';
    }
    if (
      this.authorizationService.isAccessGranted(
        actorContext,
        authorization,
        AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_MEMBERSHIP
      )
    ) {
      return 'platform-support';
    }
    return undefined;
  }

  /**
   * Throwing form. When neither path admits, throws exactly what
   * `grantAccessOrFail` throws for the base privilege. When the Support path
   * admitted and the action targets the acting user, refuses with the same
   * exception class and {@link SELF_TARGET_REFUSAL_REASON}.
   */
  authorizeOrFail(
    actorContext: ActorContext,
    authorization: IAuthorizationPolicy | undefined,
    basePrivilege: AuthorizationPrivilege,
    reason: string,
    opts?: { targetActorID?: string }
  ): OrgCommunityBranch {
    const branch = this.resolveBranch(
      actorContext,
      authorization,
      basePrivilege
    );
    if (branch === undefined) {
      // Neither path admits: raise the standard forbidden error for the
      // base privilege, message and class unchanged.
      this.authorizationService.grantAccessOrFail(
        actorContext,
        authorization,
        basePrivilege,
        reason
      );
      return 'entity-admin';
    }
    if (
      branch === 'platform-support' &&
      opts?.targetActorID !== undefined &&
      opts.targetActorID === actorContext.actorID
    ) {
      throw this.selfTargetRefusal(actorContext, authorization);
    }
    return branch;
  }

  /** The refusal raised for a self-targeted action on the Support path. */
  selfTargetRefusal(
    actorContext: ActorContext,
    authorization: IAuthorizationPolicy | undefined
  ): ForbiddenAuthorizationPolicyException {
    return new ForbiddenAuthorizationPolicyException(
      SELF_TARGET_REFUSAL_REASON,
      AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_MEMBERSHIP,
      authorization?.id ?? '',
      actorContext.actorID
    );
  }
}
