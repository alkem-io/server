import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LogContext } from '@common/enums/logging.context';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ROLE_CREDENTIAL_MAP } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import {
  FEATURE_FAMILY_ROLES,
  PLATFORM_FAMILY_ROLES,
} from './platform.role.assignment.rules.service';

/**
 * 027-platform-role-redesign (sec-server-10 fix) — the A20/A20b holder-list
 * read predicate, extracted OUT of `role.set.resolver.fields.ts`'s
 * `checkHolderListAccessOrFail` (its only prior home) so a second surface
 * reading the SAME data by a different route — `actorsWithCredential` /
 * `usersWithAuthorizationCredential` (admin.authorization.resolver.queries.ts)
 * — cannot drift from it. Before this extraction, those two queries were
 * gated only on the platform-wide `READ_USERS` (granted to every registered
 * user), so ANY authenticated user could enumerate every Platform Roles
 * Admin / Platform Content Full Access / Platform Users Admin / Platform
 * Audit Reader holder on the platform by naming the credential directly —
 * a complete bypass of the A20/A20b gate the role-set fields enforce.
 *
 * Credentials, not `RoleName`s: `actorsWithCredential`/
 * `usersWithAuthorizationCredential` take a `CredentialType`/
 * `AuthorizationCredential` argument, not a `RoleName` — the platform
 * role-set's `RoleName` and `AuthorizationCredential` string values are
 * IDENTICAL for every member of `PLATFORM_FAMILY_ROLES`/`FEATURE_FAMILY_ROLES`
 * (research D2, `ROLE_CREDENTIAL_MAP`'s own doc comment), so the credential
 * sets below are derived from the SAME canonical map `role.set.resolver.
 * fields.ts` would otherwise have re-declared independently.
 */
export const PLATFORM_TARGET_CREDENTIALS: ReadonlySet<AuthorizationCredential> =
  new Set([...PLATFORM_FAMILY_ROLES].map(role => ROLE_CREDENTIAL_MAP[role]));

export const FEATURE_TARGET_CREDENTIALS: ReadonlySet<AuthorizationCredential> =
  new Set([...FEATURE_FAMILY_ROLES].map(role => ROLE_CREDENTIAL_MAP[role]));

/** True for any credential this predicate has an opinion on — a caller uses
 * this to decide whether to apply `checkCredentialHolderListAccessOrFail`
 * INSTEAD OF its ordinary (e.g. `READ_USERS`) gate, rather than in addition
 * to it, mirroring `checkHolderListAccessOrFail`'s own role/no-role branch. */
export function isRoleHolderListCredential(
  credential: AuthorizationCredential
): boolean {
  return (
    PLATFORM_TARGET_CREDENTIALS.has(credential) ||
    FEATURE_TARGET_CREDENTIALS.has(credential)
  );
}

/** The shared predicate (sec-server-10 fix). Throws the SAME contract-shaped
 * `ForbiddenException` `checkHolderListAccessOrFail` throws for the
 * equivalent `RoleName` case — callers on either surface see identical
 * denial text for the same underlying rule. */
export function checkCredentialHolderListAccessOrFail(
  authorizationService: AuthorizationService,
  actorContext: ActorContext,
  authorization: IAuthorizationPolicy | undefined,
  credential: AuthorizationCredential
): void {
  if (PLATFORM_TARGET_CREDENTIALS.has(credential)) {
    const granted = authorizationService.isAccessGranted(
      actorContext,
      authorization,
      AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ
    );
    if (!granted) {
      throw new ForbiddenException(
        `Forbidden: ${AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ} required to read holders of ${credential}`,
        LogContext.AUTH_POLICY
      );
    }
    return;
  }
  if (FEATURE_TARGET_CREDENTIALS.has(credential)) {
    const viaRolesAdmin = authorizationService.isAccessGranted(
      actorContext,
      authorization,
      AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ
    );
    const viaFeatureAdmin = authorizationService.isAccessGranted(
      actorContext,
      authorization,
      AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ
    );
    if (!viaRolesAdmin && !viaFeatureAdmin) {
      throw new ForbiddenException(
        `Forbidden: ${AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ} or ${AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ} required to read holders of ${credential}`,
        LogContext.AUTH_POLICY
      );
    }
    return;
  }
  // Not a platform-*/feature-* target credential — this predicate has
  // nothing to add; the caller's ordinary gate (READ_USERS, plain READ, …)
  // already applies and is left untouched.
}
