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

  // Role attribution never produces `platform_admin`: an actor holding a real
  // role that is not this surface's owner gets a throw, not a silent
  // attribution to the coarse tier.
  it('throws for a non-owning platform role rather than attributing it to platform_admin', () => {
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

  it('throws when the actor holds no owning role', () => {
    expect(() =>
      resolveInitiatorRole({
        actorCredentialTypes: [AuthorizationCredential.SPACE_MEMBER],
        intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
      })
    ).toThrow(/empty intersection/);
  });

  it('throws when the actor holds several platform roles, none of them owning this surface', () => {
    expect(() =>
      resolveInitiatorRole({
        actorCredentialTypes: [
          AuthorizationCredential.PLATFORM_SUPPORT,
          AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN,
          AuthorizationCredential.PLATFORM_USERS_ADMIN,
        ],
        intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      })
    ).toThrow(/empty intersection/);
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

  // The best-effort twin of the throw above: it degrades instead of throwing.
  // `self` is its documented last-resort attribution, and the point of this
  // function existing at all is that an audit write must never take down the
  // operation it is recording.
  it('degrades to self rather than throwing for a non-owning platform role', () => {
    const result = resolveInitiatorRoleBestEffort({
      actorCredentialTypes: [AuthorizationCredential.PLATFORM_SUPPORT],
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    });
    expect(result).toBe(PlatformAuditInitiatorRole.SELF);
  });
});
