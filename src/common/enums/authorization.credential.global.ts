export enum AuthorizationRoleGlobal {
  GLOBAL_REGISTERED = 'global-registered',
  PLATFORM_OPERATIONS_ADMIN = 'platform-operations-admin',
  // --- 027-platform-role-redesign: target role model ---
  // T077 (Slice B): `global-community-read`, `global-support` and
  // `global-admin` are gone. Every capability they carried is now held by the
  // owning role below, explicitly — spec §Target global role model.
  PLATFORM_ROLES_ADMIN = 'platform-roles-admin',
  PLATFORM_CONTENT_FULL_ACCESS = 'platform-content-full-access',
  PLATFORM_RESOURCE_ADMIN = 'platform-resource-admin',
  PLATFORM_SETTINGS_ADMIN = 'platform-settings-admin',
  PLATFORM_USERS_ADMIN = 'platform-users-admin',
  PLATFORM_SUPPORT = 'platform-support',
  PLATFORM_LICENSE_MANAGER = 'platform-license-manager',
  PLATFORM_SPACES_READER = 'platform-spaces-reader',
  PLATFORM_AUDIT_READER = 'platform-audit-reader',
  FEATURE_BETA_TESTER = 'feature-beta-tester',
  FEATURE_VIRTUAL_ASSISTANT = 'feature-virtual-assistant',
  FEATURE_ORGANIZATION_CREATOR = 'feature-organization-creator',
}
