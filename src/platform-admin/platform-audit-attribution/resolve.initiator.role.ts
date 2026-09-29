import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';

/**
 * FR-025's attribution rule, shared code, called once beside every audit
 * writer (data-model.md §6, T058a) — never decided locally by a writer. The
 * value written is the SINGLE role whose privilege authorized this call.
 *
 * The empty intersection is legitimate TWICE, and falls back rather than
 * throws (eighth clarification pass — reversed the earlier reading of this
 * rule, which had it throw):
 *  - the actor holds a LEGACY BROAD credential (not an owning role) —
 *    Slice A's `{owning role} ∪ legacy` grant set makes this the NORMAL
 *    case for every un-migrated operator → `platform_admin`.
 *  - there is NO actor at all (bootstrap-seeded, FR-013b) → `system`.
 *
 * Any OTHER empty intersection is a genuine defect and THROWS (fifteenth
 * analyze pass) — a gate reachable by a credential no grant set declares.
 * **This is only safe on a DUAL-PATH surface (A6/A7/A8) if the caller
 * applies FR-018a's write boundary first** — invoke the audit writer only
 * when the PLATFORM privilege authorized the call, never on the ordinary-
 * owner branch. This helper cannot see which branch fired; it trusts its
 * caller, exactly as every audit writer in this feature does.
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

/** Legacy broad credentials that reach an audited surface ONLY through the
 * Slice A additive union, not because they own the action. Used as the
 * DEFAULT legacy-reacher set — callers may narrow it per-surface via
 * `legacyReachers` (the census's declared value for that surface, once
 * T040b exists) when a surface's legacy reach differs. */
export const DEFAULT_LEGACY_BROAD_CREDENTIALS: readonly AuthorizationCredential[] =
  [
    AuthorizationCredential.GLOBAL_ADMIN,
    AuthorizationCredential.GLOBAL_SUPPORT,
    AuthorizationCredential.GLOBAL_LICENSE_MANAGER,
  ];

export interface ResolveInitiatorRoleInput {
  /** The acting operator's credentials. Omit entirely for a
   * bootstrap-seeded write (no actor) — resolves to `system`. */
  actorCredentialTypes?: readonly AuthorizationCredential[];
  /** The surface's declared owning role(s) (census `intendedOwners`, or the
   * single role a non-census caller knows is the intended owner). */
  intendedOwners: readonly AuthorizationCredential[];
  /** The surface's declared legacy reachers (census `legacyReachers`).
   * Defaults to the three legacy broad grants if omitted. */
  legacyReachers?: readonly AuthorizationCredential[];
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

  const legacyReachers =
    input.legacyReachers ?? DEFAULT_LEGACY_BROAD_CREDENTIALS;
  if (legacyReachers.some(credential => held.has(credential))) {
    return PlatformAuditInitiatorRole.PLATFORM_ADMIN;
  }

  throw new Error(
    'resolveInitiatorRole: empty intersection — the actor holds neither an ' +
      'owning role nor a legacy broad credential for this surface. This is ' +
      'an FR-034-class defect (a gate reachable by an undeclared credential), ' +
      'unless this call site is a DUAL-PATH surface (A6/A7/A8) that has not ' +
      "applied FR-018a's write boundary — the writer must only be invoked " +
      'when the PLATFORM privilege authorized the call, never on the owner branch.'
  );
}

/** Same attribution, but for a REJECTED attempt (corr-server-3/qual-server-1
 * fix): the actor may legitimately hold neither the owning role nor a
 * legacy credential — that is often exactly WHY the rejection happened, so
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
