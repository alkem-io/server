import { RoleName } from '@common/enums/role.name';

// Human-readable label for every platform role-set `RoleName`. Keyed
// exhaustively so a role added to the enum without a label here fails
// `pnpm lint` (a missing key is a type error) — the completeness check every
// rendering surface that displays a role by name relies on.
export const PLATFORM_ROLE_DISPLAY_LABELS: Readonly<Record<RoleName, string>> =
  {
    [RoleName.MEMBER]: 'Member',
    [RoleName.LEAD]: 'Lead',
    [RoleName.ADMIN]: 'Admin',
    [RoleName.ASSOCIATE]: 'Associate',
    [RoleName.OWNER]: 'Owner',
    [RoleName.PLATFORM_OPERATIONS_ADMIN]: 'Platform Operations Admin',
    // --- 027-platform-role-redesign: target role model ---
    [RoleName.PLATFORM_ROLES_ADMIN]: 'Platform Roles Admin',
    [RoleName.PLATFORM_CONTENT_FULL_ACCESS]: 'Platform Content Full Access',
    [RoleName.PLATFORM_RESOURCE_ADMIN]: 'Platform Resource Admin',
    [RoleName.PLATFORM_SETTINGS_ADMIN]: 'Platform Settings Admin',
    [RoleName.PLATFORM_USERS_ADMIN]: 'Platform Users Admin',
    [RoleName.PLATFORM_SUPPORT]: 'Platform Support',
    [RoleName.PLATFORM_LICENSE_MANAGER]: 'Platform License Manager',
    [RoleName.PLATFORM_SPACES_READER]: 'Platform Spaces Reader',
    [RoleName.PLATFORM_AUDIT_READER]: 'Platform Audit Reader',
    [RoleName.FEATURE_BETA_TESTER]: 'Feature Beta Tester',
    [RoleName.FEATURE_VIRTUAL_ASSISTANT]: 'Feature Virtual Assistant',
    [RoleName.FEATURE_ORGANIZATION_CREATOR]: 'Feature Organization Creator',
    [RoleName.FEATURE_VC_CAMPAIGN]: 'Feature VC Campaign',
    [RoleName.REGISTERED]: 'Registered',
    [RoleName.GUEST]: 'Guest',
    [RoleName.ANONYMOUS]: 'Anonymous',
  };

// Deterministic fallback for a slug with no explicit label above — an
// unknown role, or a retired legacy role slug still stored in an in-app
// notification written before 027 Slice B. Split on hyphens, capitalise the
// first letter of each word, join with spaces. Never blank, never throws.
export function humanizeRoleSlug(slug: string): string {
  return slug
    .split('-')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// The label a rendering surface should show for a role/credential slug:
// the explicit map above when the slug is a known `RoleName`, otherwise the
// humanized fallback.
export function resolveRoleDisplayLabel(slug: string): string {
  return (
    (PLATFORM_ROLE_DISPLAY_LABELS as Readonly<Record<string, string>>)[slug] ??
    humanizeRoleSlug(slug)
  );
}
