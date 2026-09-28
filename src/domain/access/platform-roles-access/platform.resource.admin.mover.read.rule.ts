import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { RoleName } from '@common/enums/role.name';
import type { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import type { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import type { IPlatformRolesAccess } from './platform.roles.access.interface';

/**
 * 027-platform-role-redesign (QA server-C1-1, ruling (b′) "mover-only reads").
 *
 * Platform Resource Admin's space READ no longer cascades, so it reads the
 * space it moves but not the space's content. The space-conversion panel
 * still reads the community roleSet below the space — `SpaceConversionLookup`'s
 * member lists (`usersInRole` / `organizationsInRole` /
 * `virtualContributorsInRole`) — which is READ-gated on its own policy.
 *
 * This builds that policy's one NON-cascading READ rule for the mover. It is
 * derived from the space's own stored `platformRolesAccess` (the same per-role
 * derivation the space rule uses), so it appears only where the space
 * declares READ for the mover.
 *
 * Deliberately NOT applied to callouts sets or callouts (decided 2026-09-25):
 * a trial READ on published callouts exposed their contributions (posts,
 * whiteboards) through resolvers that only check the parent callout. The
 * mover therefore cannot resolve callouts in a private space; moving one
 * needs Platform Support in a support-enabled space, or the space's own admin.
 */
export function createPlatformResourceAdminMoverReadRule(
  authorizationPolicyService: AuthorizationPolicyService,
  platformRolesAccess: IPlatformRolesAccess | undefined,
  ruleName: string
): IAuthorizationPolicyRuleCredential | undefined {
  const declaresRead = (platformRolesAccess?.roles ?? []).some(
    role =>
      role.roleName === RoleName.PLATFORM_RESOURCE_ADMIN &&
      role.grantedPrivileges.includes(AuthorizationPrivilege.READ)
  );
  if (!declaresRead) {
    return undefined;
  }
  const rule = authorizationPolicyService.createCredentialRuleUsingTypesOnly(
    [AuthorizationPrivilege.READ],
    [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN],
    ruleName
  );
  rule.cascade = false;
  return rule;
}
