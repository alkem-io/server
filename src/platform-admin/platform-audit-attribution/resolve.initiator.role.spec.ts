import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { describe, expect, it } from 'vitest';
import {
  resolveInitiatorRole,
  resolveInitiatorRoleBestEffort,
} from './resolve.initiator.role';

describe('resolveInitiatorRole (FR-025, T058a)', () => {
  it('resolves the single owning role when the actor holds it', () => {
    const result = resolveInitiatorRole({
      actorCredentialTypes: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    });
    expect(result).toBe(PlatformAuditInitiatorRole.PLATFORM_USERS_ADMIN);
  });

  it('never returns a broader role than the one that authorized the call — picks the OWNING role even when the actor holds several', () => {
    const result = resolveInitiatorRole({
      actorCredentialTypes: [
        AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN,
        AuthorizationCredential.PLATFORM_USERS_ADMIN,
      ],
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    });
    expect(result).toBe(PlatformAuditInitiatorRole.PLATFORM_USERS_ADMIN);
  });

  // 027-platform-role-redesign (T077, Slice B): INVERTED. This asserted that a
  // legacy broad credential resolved to the `platform_admin` carve-out. The
  // three credentials that could are gone and `DEFAULT_LEGACY_BROAD_CREDENTIALS`
  // is empty, so the fallback is unreachable — which is precisely how T018 said
  // the carve-out would expire. The assertion is now that it HAS expired: an
  // actor holding a real role that is not this surface's owner gets an
  // FR-034-class throw, not a silent attribution to a retired coarse tier.
  it('the platform_admin carve-out has expired — a non-owning role no longer falls back to it', () => {
    expect(() =>
      resolveInitiatorRole({
        actorCredentialTypes: [AuthorizationCredential.PLATFORM_SUPPORT],
        intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      })
    ).toThrow(/empty intersection/);
  });

  it('falls back to system when there is no actor at all (bootstrap-seeded)', () => {
    const result = resolveInitiatorRole({
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
    });
    expect(result).toBe(PlatformAuditInitiatorRole.SYSTEM);
  });

  it('throws on a genuine empty intersection (neither owning role nor legacy credential)', () => {
    expect(() =>
      resolveInitiatorRole({
        actorCredentialTypes: [AuthorizationCredential.SPACE_MEMBER],
        intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      })
    ).toThrow(/empty intersection/);
  });

  it('respects a narrowed per-surface legacyReachers set (e.g. A1: only global-admin, not global-support/license-manager)', () => {
    expect(() =>
      resolveInitiatorRole({
        actorCredentialTypes: [AuthorizationCredential.PLATFORM_SUPPORT],
        intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
        legacyReachers: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
      })
    ).toThrow(/empty intersection/);

    const result = resolveInitiatorRole({
      actorCredentialTypes: [
        AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
      ],
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
    });
    expect(result).toBe(PlatformAuditInitiatorRole.PLATFORM_ADMIN);
  });
});

// qual-server-9 fix: `resolveInitiatorRoleBestEffort` — the wrapper EVERY
// rejection-path audit write in this feature MUST use instead of the strict
// function above — had zero test coverage anywhere in the repo, despite
// being the exact function corr-server-3/qual-server-1 added to close a
// prior defect. A regression turning its SELF fallback into, say, SYSTEM
// would misattribute every rejected attempt to the platform itself with no
// failing test.
describe('resolveInitiatorRoleBestEffort (corr-server-3/qual-server-1 fix)', () => {
  it('falls back to SELF on a genuine empty intersection, rather than throwing', () => {
    const result = resolveInitiatorRoleBestEffort({
      actorCredentialTypes: [AuthorizationCredential.SPACE_MEMBER],
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    });
    expect(result).toBe(PlatformAuditInitiatorRole.SELF);
  });

  it('still resolves the owning role normally when the intersection is non-empty (unchanged from the strict function)', () => {
    const result = resolveInitiatorRoleBestEffort({
      actorCredentialTypes: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    });
    expect(result).toBe(PlatformAuditInitiatorRole.PLATFORM_USERS_ADMIN);
  });

  // T077 (Slice B): the best-effort twin of the inverted test above. With the
  // legacy union empty it no longer has a fallback to resolve, so it does what
  // it is FOR — degrades instead of throwing. `self` is its documented
  // last-resort attribution, and the point of this function existing at all
  // (corr-server-3/qual-server-1) is that an audit write must never take down
  // the operation it is recording.
  it('degrades to self rather than throwing, now that the legacy-broad fallback is empty', () => {
    const result = resolveInitiatorRoleBestEffort({
      actorCredentialTypes: [AuthorizationCredential.PLATFORM_SUPPORT],
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    });
    expect(result).toBe(PlatformAuditInitiatorRole.SELF);
  });
});
