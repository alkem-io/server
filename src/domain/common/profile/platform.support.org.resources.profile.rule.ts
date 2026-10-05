import { POLICY_RULE_PLATFORM_SUPPORT_ORG_RESOURCES_PROFILE_EDIT } from '@common/constants/authorization/policy.rule.constants';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';

/**
 * 027-platform-role-redesign (QA server-C2-c, ruling (a)) — A7: Platform
 * Support edits an organization-owned innovation pack / innovation hub and
 * CRUDs its templates. Its PLATFORM_SUPPORT_ORG_RESOURCES privilege cascades
 * from ORGANIZATION-hosted accounts only (`account.service.authorization.ts`),
 * but the shared profile / reference / visual / storage-bucket mutations
 * check UPDATE / CREATE / FILE_UPLOAD, so the pack/hub edit form's media and
 * reference edits were refused.
 *
 * This privilege rule maps PLATFORM_SUPPORT_ORG_RESOURCES to UPDATE, CREATE
 * and FILE_UPLOAD — never DELETE (deleting belongs to A8). Privilege rules do
 * NOT cascade, so `ProfileAuthorizationService` appends it to EACH policy of
 * the profile subtree (profile, references, visuals, storage bucket). It is
 * threaded down ONLY from the pack, hub and template authorization services —
 * never appended generically — because the privilege also cascades into the
 * org account's own profile and storage aggregator, which A7 does not cover.
 * It fires only where the source privilege is actually held, so on a
 * user-hosted account, a space template or the platform library it is inert.
 *
 * Known residual: a reference created AFTER the last auth reset inherits only
 * the profile's cascading credential rules (privilege rules are not copied by
 * `inheritParentAuthorization`), so Support can create it but not upload a
 * file onto it until the next authorization reset of the pack/hub.
 */
export function createPlatformSupportOrgResourcesProfileEditRule(): AuthorizationPolicyRulePrivilege {
  return new AuthorizationPolicyRulePrivilege(
    [
      AuthorizationPrivilege.UPDATE,
      AuthorizationPrivilege.CREATE,
      AuthorizationPrivilege.FILE_UPLOAD,
    ],
    AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES,
    POLICY_RULE_PLATFORM_SUPPORT_ORG_RESOURCES_PROFILE_EDIT
  );
}
