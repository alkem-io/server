import { AuthorizationCredential } from '@common/enums/authorization.credential';

/**
 * The declared owners the audit writers attribute against, for the census
 * rows whose audited surfaces span more than one resolver. Each one mirrors
 * the `intendedOwners` of its row's audited entries in the census
 * (`a.row.surfaces.ts`) — `audit.intended.owners.spec.ts` asserts it does.
 * Attribution throws for an actor holding none of them, and the fail-open
 * writers then skip the audit row, so a copy that drifted from the census
 * would lose audit rows silently.
 */

/** A5 — user-record deletion (the PLATFORM_USERS_ADMIN grant). */
export const A5_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_USERS_ADMIN,
];

/** A12 — license assignment (the licensing-framework GRANT and the
 * ACCOUNT_LICENSE_MANAGE grant). */
export const A12_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_LICENSE_MANAGER,
];
