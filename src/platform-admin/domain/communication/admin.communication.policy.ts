import { GLOBAL_POLICY_ADMIN_COMMUNICATION_GRANT } from '@common/constants/authorization/global.policy.constants';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';

/**
 * Synthetic, in-memory policy gating the messaging-platform operations
 * surfaces (mutations and operator reads alike) on a deliberately narrower
 * role set than the platform policy: GLOBAL_ADMIN (historic holder) plus
 * PLATFORM_OPERATIONS_ADMIN. Never persisted, never touched by an
 * authorization reset; the privilege is granted on this policy only.
 */
export const createCommunicationOperationsPolicy = (
  authorizationPolicyService: AuthorizationPolicyService
): IAuthorizationPolicy =>
  authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
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
