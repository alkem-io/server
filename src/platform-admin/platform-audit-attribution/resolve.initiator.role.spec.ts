import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { describe, expect, it } from 'vitest';
import { resolveInitiatorRole } from './resolve.initiator.role';

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

  it('falls back to platform_admin for a LEGACY BROAD credential (Slice A additive union, guaranteed from day one)', () => {
    const result = resolveInitiatorRole({
      actorCredentialTypes: [AuthorizationCredential.GLOBAL_SUPPORT],
      intendedOwners: [AuthorizationCredential.PLATFORM_USERS_ADMIN],
    });
    expect(result).toBe(PlatformAuditInitiatorRole.PLATFORM_ADMIN);
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
        actorCredentialTypes: [AuthorizationCredential.GLOBAL_SUPPORT],
        intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
        legacyReachers: [AuthorizationCredential.GLOBAL_ADMIN],
      })
    ).toThrow(/empty intersection/);

    const result = resolveInitiatorRole({
      actorCredentialTypes: [AuthorizationCredential.GLOBAL_ADMIN],
      intendedOwners: [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
      legacyReachers: [AuthorizationCredential.GLOBAL_ADMIN],
    });
    expect(result).toBe(PlatformAuditInitiatorRole.PLATFORM_ADMIN);
  });
});
