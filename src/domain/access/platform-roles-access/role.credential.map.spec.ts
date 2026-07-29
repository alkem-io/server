import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import {
  LEGACY_PLATFORM_ROLE_SEED_DEFINITIONS,
  NEW_PLATFORM_ROLE_SEED_DEFINITIONS,
} from '@src/migrations/utils/platform.role.seed.definitions';
import { describe, expect, it } from 'vitest';
import {
  ROLE_CREDENTIAL_MAP,
  ROLE_CREDENTIAL_OVERRIDES_BY_ROLE_SET_TYPE,
  resolveRoleCredential,
} from './platform.roles.access.service';

/**
 * FR-011 / SC-008 anti-drift guard (research D14, T011). The C1 silent-void
 * defect was two seeded role rows whose STORED `credential.type` did not
 * match any real `AuthorizationCredential` member — a user granted
 * `global-spaces-reader` or `global-community-reader` silently received NO
 * access, because nothing checks for a credential type that doesn't exist.
 * `ROLE_CREDENTIAL_MAP` REPAIRS this at the resolution layer (T009/T010):
 * it returns the CORRECT credential (`global-spaces-read` /
 * `global-community-read`) regardless of what the DB row's `credential.type`
 * says — so for exactly these two rows, the map's resolved value is
 * EXPECTED to diverge from the stored seed value. This spec makes that
 * divergence — and its absence everywhere else — build-failing rather than
 * discoverable-in-production:
 *
 *  (a) `ROLE_CREDENTIAL_MAP` resolves every platform-role-set `RoleName` to a
 *      real `AuthorizationCredential` member (never `undefined`, never a
 *      bare string).
 *  (b) For the twelve NEW target roles (research D2), the credential value
 *      string is IDENTICAL to the role value string — one canonical
 *      identifier per role, so the map and the role can never independently
 *      drift for anything this feature adds.
 *  (c) For every seed definition EXCEPT the two known C1 defects, the map's
 *      resolved credential equals the STORED `credential.type` on that
 *      role's own seed row — so a future hand-edit to either without the
 *      other fails here, not in production. The two defect rows are
 *      asserted to diverge, by name, so a THIRD divergence appearing
 *      unnoticed also fails here.
 */
describe('027-platform-role-redesign: ROLE_CREDENTIAL_MAP anti-drift (FR-011/SC-008)', () => {
  const allSeedDefinitions = [
    ...LEGACY_PLATFORM_ROLE_SEED_DEFINITIONS,
    ...NEW_PLATFORM_ROLE_SEED_DEFINITIONS,
  ];

  /** The C1 silent-void defect, verified against the current tree (T069):
   * exactly these two seeded rows name a credential.type no
   * AuthorizationCredential member carries. No repair migration ships
   * (D1) — the fix is structural, in ROLE_CREDENTIAL_MAP's resolution. */
  const KNOWN_C1_DEFECT_ROLE_NAMES = new Set([
    'global-spaces-reader',
    'global-community-reader',
  ]);

  function roleNameFor(name: string): RoleName {
    const value = Object.values(RoleName).find(v => v === name);
    expect(value, `RoleName has no member with value "${name}"`).toBeDefined();
    return value as RoleName;
  }

  it.each(
    allSeedDefinitions
  )('seed definition "$name" has a matching ROLE_CREDENTIAL_MAP entry, correctly resolved', def => {
    const roleNameValue = roleNameFor(def.name);
    const mappedCredential = ROLE_CREDENTIAL_MAP[roleNameValue];
    expect(
      mappedCredential,
      `ROLE_CREDENTIAL_MAP has no entry for RoleName "${def.name}"`
    ).toBeDefined();

    // The resolved credential value must itself be a real
    // AuthorizationCredential member — never a bare string that happens to
    // compile because the Record key already narrowed it.
    expect(Object.values(AuthorizationCredential)).toContain(mappedCredential);

    if (KNOWN_C1_DEFECT_ROLE_NAMES.has(def.name)) {
      // (c), the defect half: the map's resolved value MUST diverge from
      // the wrong stored value — that divergence IS the repair. If this
      // ever passes as equal, the map has regressed to trusting the
      // broken stored type again.
      expect(mappedCredential).not.toBe(def.credentialType);
    } else {
      // (c), the healthy half: map and stored row agree.
      expect(mappedCredential).toBe(def.credentialType);
    }
  });

  it.each(
    NEW_PLATFORM_ROLE_SEED_DEFINITIONS
  )('target role "$name" (D2): RoleName and AuthorizationCredential are the SAME string', def => {
    expect(def.credentialType).toBe(def.name);
  });

  it('covers every platform-role-set RoleName with no orphan on either side', () => {
    const seedNames = new Set(allSeedDefinitions.map(def => def.name));
    // Space/organization-scoped roles and the two credential-only tiers
    // (guest, anonymous) are never rows on the platform RoleSet.
    const nonPlatformRoleSetRoles = new Set<RoleName>([
      RoleName.MEMBER,
      RoleName.LEAD,
      RoleName.ADMIN,
      RoleName.ASSOCIATE,
      RoleName.OWNER,
      RoleName.GUEST,
      RoleName.ANONYMOUS,
    ]);
    for (const roleName of Object.values(RoleName)) {
      if (nonPlatformRoleSetRoles.has(roleName)) {
        continue;
      }
      expect(
        seedNames.has(roleName),
        `RoleName "${roleName}" is not a non-platform-role-set exception and has no seed row`
      ).toBe(true);
    }
  });

  it('records exactly the two known C1 legacy defects — repaired structurally, not by data migration (research D1, T069)', () => {
    const actualDefects = LEGACY_PLATFORM_ROLE_SEED_DEFINITIONS.filter(def => {
      const mapped = ROLE_CREDENTIAL_MAP[roleNameFor(def.name)];
      return mapped !== def.credentialType;
    }).map(def => def.name);

    expect(actualDefects.sort()).toEqual(
      [...KNOWN_C1_DEFECT_ROLE_NAMES].sort()
    );
  });

  /**
   * Regression cover for the role-set-type collapse found live on 2026-07-29.
   *
   * ROLE_CREDENTIAL_MAP is `Record<RoleName, AuthorizationCredential>` — keyed
   * by role name ALONE. That is correct for the platform role-set, whose names
   * are globally unique, but `RoleName.ADMIN` is shared: SPACE -> space-admin,
   * ORGANIZATION -> organization-admin. Resolving an ORGANIZATION role-set's
   * ADMIN through the flat map silently produced `space-admin`, so every
   * organization-admin promotion was mis-credentialed and the FR-002/FR-031
   * feature-role inheritance (which filters for organization-admin /
   * organization-owner) never fired.
   *
   * Nothing in the suite above could catch this: it asserts the map against the
   * PLATFORM seed definitions only, and the collapse is invisible unless the
   * role-set dimension is asserted explicitly.
   */
  describe('resolveRoleCredential — role-set-type dimension', () => {
    it('resolves ORGANIZATION ADMIN to organization-admin, not space-admin', () => {
      expect(
        resolveRoleCredential(RoleName.ADMIN, RoleSetType.ORGANIZATION)
      ).toBe(AuthorizationCredential.ORGANIZATION_ADMIN);
    });

    it('resolves SPACE ADMIN to space-admin', () => {
      expect(resolveRoleCredential(RoleName.ADMIN, RoleSetType.SPACE)).toBe(
        AuthorizationCredential.SPACE_ADMIN
      );
    });

    it('falls back to the flat map for every role with no role-set override', () => {
      for (const roleName of Object.values(RoleName)) {
        for (const roleSetType of Object.values(RoleSetType)) {
          const overridden =
            ROLE_CREDENTIAL_OVERRIDES_BY_ROLE_SET_TYPE[roleSetType]?.[roleName];
          if (overridden) {
            continue;
          }
          expect(
            resolveRoleCredential(roleName, roleSetType),
            `${roleName} on a ${roleSetType} role-set must fall through to ROLE_CREDENTIAL_MAP`
          ).toBe(ROLE_CREDENTIAL_MAP[roleName]);
        }
      }
    });

    it('matches each role-set type definition file — the real anti-drift assertion', () => {
      // Sourced from organization.role.definitions.ts / space.community.roles.ts:
      // if either file changes a credential, this fails rather than drifting.
      const expected: Array<[RoleSetType, RoleName, AuthorizationCredential]> =
        [
          [
            RoleSetType.ORGANIZATION,
            RoleName.ASSOCIATE,
            AuthorizationCredential.ORGANIZATION_ASSOCIATE,
          ],
          [
            RoleSetType.ORGANIZATION,
            RoleName.ADMIN,
            AuthorizationCredential.ORGANIZATION_ADMIN,
          ],
          [
            RoleSetType.ORGANIZATION,
            RoleName.OWNER,
            AuthorizationCredential.ORGANIZATION_OWNER,
          ],
          [
            RoleSetType.SPACE,
            RoleName.MEMBER,
            AuthorizationCredential.SPACE_MEMBER,
          ],
          [
            RoleSetType.SPACE,
            RoleName.LEAD,
            AuthorizationCredential.SPACE_LEAD,
          ],
          [
            RoleSetType.SPACE,
            RoleName.ADMIN,
            AuthorizationCredential.SPACE_ADMIN,
          ],
        ];
      for (const [roleSetType, roleName, credential] of expected) {
        expect(
          resolveRoleCredential(roleName, roleSetType),
          `${roleName} on a ${roleSetType} role-set`
        ).toBe(credential);
      }
    });
  });
});
