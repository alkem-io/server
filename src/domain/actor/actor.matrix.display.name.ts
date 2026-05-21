import { IActor } from '@domain/actor/actor/actor.interface';

/**
 * Canonical Matrix-side displayName formula for any Actor.
 *
 * Returns `actor.profile.displayName` (trimmed) when non-empty, otherwise falls
 * back to `actor.nameID`. Email is explicitly NEVER used as a fallback (FR-018:
 * email is PII and would leak into Matrix room state if surfaced as a member's
 * displayName).
 *
 * This formula is uniform across all Actor types (User, VirtualContributor,
 * Organization, Space, Account, ...) — `profile` and `nameID` are inherited
 * via `NameableEntity`, so the helper works on any Actor without per-type
 * branching.
 *
 * For default User actors created through the normal sign-up flow,
 * `profile.displayName` is initialised at actor-creation time to
 * `"${firstName} ${lastName}".trim()` (see `bootstrap.service.ts:317` and
 * `user.identity.service.ts:312`), so the helper yields the same string as
 * today's `firstName + lastName` formula for the 99% case. It diverges only
 * when a profile owner later edits their displayName, in which case the
 * Matrix-side name correctly follows the edit instead of being frozen.
 *
 * Used at:
 *   - The new `room.info` RPC handler (feature 099-element-room-check)
 *   - `UserService.syncActor` (replaces the email-leaking formula)
 *   - `AdminCommunicationSpaceSyncService.syncDisplayNames` (User + VC iterations)
 *   - `VirtualContributorService.syncActor`
 *
 * Pure function. No DI, no logging, no side effects.
 */
export const getMatrixDisplayName = (actor: IActor): string => {
  return actor.profile?.displayName?.trim() || actor.nameID;
};
