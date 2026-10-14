import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';

/**
 * The audit attribution rule, shared code, called once beside every audit
 * writer — never decided locally by a writer. The value written is the
 * SINGLE role whose privilege authorized this call.
 *
 * The empty intersection is legitimate ONCE, and falls back rather than
 * throws: there is NO actor at all (a bootstrap-seeded write) → `system`.
 *
 * Any OTHER empty intersection is a genuine defect and THROWS — a gate
 * reachable by a credential no grant set declares. **This is only safe on a
 * DUAL-PATH surface (A6/A7/A8) if the caller applies the platform write
 * boundary first** — invoke the audit writer only when the PLATFORM
 * privilege authorized the call, never on the ordinary-owner branch. This
 * helper cannot see which branch fired; it trusts its caller, exactly as
 * every audit writer does.
 *
 * `platform_admin` (`PlatformAuditInitiatorRole.PLATFORM_ADMIN`):
 *  - this rule never produces it — it only ever returns `system` or one of
 *    the ten platform roles;
 *  - the coarse-tier audit writers still write it by design: every
 *    platform-operations audit row (`platform.operations.audit.service.ts`),
 *    admin account deletion (`registration.service.ts`), admin MCP API-key
 *    revocation (`mcp-api-key.service.ts`) and admin email-change events
 *    (`user.email.change.service.ts`);
 *  - historical role-attribution rows written while legacy broad credentials
 *    still existed carry it;
 *  - the Postgres enum value is kept, so all of those rows stay valid and
 *    readable.
 */
const CREDENTIAL_TO_INITIATOR_ROLE: Partial<
  Record<AuthorizationCredential, PlatformAuditInitiatorRole>
> = {
  [AuthorizationCredential.PLATFORM_ROLES_ADMIN]:
    PlatformAuditInitiatorRole.PLATFORM_ROLES_ADMIN,
  [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS]:
    PlatformAuditInitiatorRole.PLATFORM_CONTENT_FULL_ACCESS,
  [AuthorizationCredential.PLATFORM_RESOURCE_ADMIN]:
    PlatformAuditInitiatorRole.PLATFORM_RESOURCE_ADMIN,
  [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN]:
    PlatformAuditInitiatorRole.PLATFORM_SETTINGS_ADMIN,
  [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN]:
    PlatformAuditInitiatorRole.PLATFORM_OPERATIONS_ADMIN,
  [AuthorizationCredential.PLATFORM_USERS_ADMIN]:
    PlatformAuditInitiatorRole.PLATFORM_USERS_ADMIN,
  [AuthorizationCredential.PLATFORM_SUPPORT]:
    PlatformAuditInitiatorRole.PLATFORM_SUPPORT,
  [AuthorizationCredential.PLATFORM_LICENSE_MANAGER]:
    PlatformAuditInitiatorRole.PLATFORM_LICENSE_MANAGER,
  [AuthorizationCredential.PLATFORM_SPACES_READER]:
    PlatformAuditInitiatorRole.PLATFORM_SPACES_READER,
  [AuthorizationCredential.PLATFORM_AUDIT_READER]:
    PlatformAuditInitiatorRole.PLATFORM_AUDIT_READER,
};

export interface ResolveInitiatorRoleInput {
  /** The acting operator's credentials. Omit entirely for a
   * bootstrap-seeded write (no actor) — resolves to `system`. */
  actorCredentialTypes?: readonly AuthorizationCredential[];
  /** The surface's declared owning role(s) (census `intendedOwners`, or the
   * single role a non-census caller knows is the intended owner). */
  intendedOwners: readonly AuthorizationCredential[];
}

export function resolveInitiatorRole(
  input: ResolveInitiatorRoleInput
): PlatformAuditInitiatorRole {
  if (!input.actorCredentialTypes) {
    return PlatformAuditInitiatorRole.SYSTEM;
  }
  const held = new Set(input.actorCredentialTypes);

  const matchingOwner = input.intendedOwners.find(owner => held.has(owner));
  if (matchingOwner) {
    const role = CREDENTIAL_TO_INITIATOR_ROLE[matchingOwner];
    if (role) {
      return role;
    }
  }

  throw new Error(
    'resolveInitiatorRole: empty intersection — the actor holds no owning ' +
      'role for this surface. This is a defect (a gate reachable by an ' +
      'undeclared credential), unless this call site is a DUAL-PATH surface ' +
      '(A6/A7/A8) that has not applied the platform write boundary — the ' +
      'writer must only be invoked when the PLATFORM privilege authorized ' +
      'the call, never on the owner branch.'
  );
}

/** Same attribution, but for a REJECTED attempt:
 * the actor may legitimately hold no owning role — that is often
 * exactly WHY the rejection happened, so
 * the strict throw path above is not a defect here. Falls back to `SELF`
 * rather than raise a second exception while already handling a rejection
 * — a real actor attempted something, so `SELF` (not `SYSTEM`) is the
 * honest default. Every rejection-path audit write (A1/A2's
 * `platform.role.resolver.mutations.ts`, A21's `user.service.ts`) MUST use
 * this wrapper, never the strict `resolveInitiatorRole` directly — the
 * denial branch is, by construction, reachable by an actor the intersection
 * was designed to reject. */
export function resolveInitiatorRoleBestEffort(
  input: ResolveInitiatorRoleInput
): PlatformAuditInitiatorRole {
  try {
    return resolveInitiatorRole(input);
  } catch {
    return PlatformAuditInitiatorRole.SELF;
  }
}
