import { registerEnumType } from '@nestjs/graphql';

export enum RoleName {
  MEMBER = 'member',
  LEAD = 'lead',
  ADMIN = 'admin',
  ASSOCIATE = 'associate',
  OWNER = 'owner',
  GLOBAL_ADMIN = 'global-admin',
  GLOBAL_SUPPORT = 'global-support', // Platform management; can be allowed to act as a SpaceAdmin depending on Space settings
  GLOBAL_LICENSE_MANAGER = 'global-license-manager',
  GLOBAL_COMMUNITY_READER = 'global-community-reader',
  GLOBAL_SPACES_READER = 'global-spaces-reader',
  GLOBAL_PLATFORM_MANAGER = 'global-platform-manager',
  GLOBAL_SUPPORT_MANAGER = 'global-support-manager',
  PLATFORM_OPERATIONS_ADMIN = 'platform-operations-admin', // operational & maintenance actions on the platform
  PLATFORM_BETA_TESTER = 'platform-beta-tester',
  PLATFORM_VC_CAMPAIGN = 'platform-vc-campaign',
  PLATFORM_ASSISTANT_ACCESS = 'platform-assistant-access',
  // --- 027-platform-role-redesign: target role model (Slice A, additive) ---
  /** Sole authority assigning `Platform …` roles; assigns `Feature …` roles too; role/holder-list read; service-profile marker. */
  PLATFORM_ROLES_ADMIN = 'platform-roles-admin',
  /** Full access across all platform content. Convention-limited, not enforced (FR-004). */
  PLATFORM_CONTENT_FULL_ACCESS = 'platform-content-full-access',
  /** Moves a space/innovation-hub/innovation-pack/VC to another account; promotes/demotes/moves a space; moves a callout. */
  PLATFORM_RESOURCE_ADMIN = 'platform-resource-admin',
  /** Platform settings, integrations, notification config; defines license plans and entitlement mappings. */
  PLATFORM_SETTINGS_ADMIN = 'platform-settings-admin',
  /** User records — login email change, identity/account deletion, PII read; assigns Feature roles (shared with Roles Admin). */
  PLATFORM_USERS_ADMIN = 'platform-users-admin',
  /** Support family: space support flag, organization's own packs/hubs, organization lifecycle, platform forum. */
  PLATFORM_SUPPORT = 'platform-support',
  /** Licensing usage — assign/revoke license plans on accounts & spaces; space visibility. */
  PLATFORM_LICENSE_MANAGER = 'platform-license-manager',
  /** Reader across spaces. Service accounts only, enforced at assignment (FR-002). */
  PLATFORM_SPACES_READER = 'platform-spaces-reader',
  /** Read-only audit trail review. Mutually exclusive with every other `Platform …` role. */
  PLATFORM_AUDIT_READER = 'platform-audit-reader',
  /** Beta/trial license entitlement. Does not confer organization creation. */
  FEATURE_BETA_TESTER = 'feature-beta-tester',
  /** Use of the virtual assistant. */
  FEATURE_VIRTUAL_ASSISTANT = 'feature-virtual-assistant',
  /** Create organizations. Does not confer organization deletion (Platform Support). */
  FEATURE_ORGANIZATION_CREATOR = 'feature-organization-creator',
  REGISTERED = 'registered',
  GUEST = 'guest',
  ANONYMOUS = 'anonymous',
}

registerEnumType(RoleName, {
  name: 'RoleName',
});
