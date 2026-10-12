import { RoleName } from '@common/enums/role.name';
import {
  humanizeRoleSlug,
  PLATFORM_ROLE_DISPLAY_LABELS,
  resolveRoleDisplayLabel,
} from './platform.role.display.labels';

describe('platform role display labels', () => {
  it('has a non-empty label for every RoleName', () => {
    for (const role of Object.values(RoleName)) {
      expect(PLATFORM_ROLE_DISPLAY_LABELS[role]).toBeTruthy();
    }
  });

  it('resolves known roles to their explicit label', () => {
    expect(resolveRoleDisplayLabel(RoleName.PLATFORM_RESOURCE_ADMIN)).toBe(
      'Platform Resource Admin'
    );
    expect(resolveRoleDisplayLabel(RoleName.FEATURE_VC_CAMPAIGN)).toBe(
      'Feature VC Campaign'
    );
  });

  it('humanizes an unknown slug: split on hyphens, capitalise each word', () => {
    expect(humanizeRoleSlug('some-future-role')).toBe('Some Future Role');
  });

  it('falls back to the humanizer for a slug outside the RoleName vocabulary, never throwing', () => {
    expect(() => resolveRoleDisplayLabel('organization-admin')).not.toThrow();
    expect(resolveRoleDisplayLabel('organization-admin')).toBe(
      'Organization Admin'
    );
  });
});
