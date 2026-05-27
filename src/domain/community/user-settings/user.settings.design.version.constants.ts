/**
 * Numeric design version generations stored on `UserSettings.designVersion`.
 *
 * The server accepts and stores any integer (FR-004) and treats the value as
 * opaque. The constants below name the generations that have a defined meaning
 * today; introducing a new generation should add a new constant here (not edit
 * an existing one).
 *
 * Phased rollout history:
 * - Phase 1 (clarification 2026-05-13): the column shipped with the default
 *   `1` (now exported as `DESIGN_VERSION_LEGACY`) so the integer plumbing could
 *   land without forcing a visible UI flip.
 * - Phase 2 (clarification 2026-05-26): the column default was flipped to `2`
 *   (now exported as `DESIGN_VERSION_CURRENT_DEFAULT`) via a column-default DDL
 *   migration with no row UPDATE — existing rows preserve whatever they had.
 *
 * Client coordination: the legacy `alkemio-crd-enabled` LocalStorage flag (a
 * boolean) should be retired in favour of a key that stores the integer value
 * read from `me.user.settings.designVersion`. TODO(client, follow-up release):
 * delete `alkemio-crd-enabled` once telemetry confirms no surface still reads
 * it; the integer value from the server is the new source of truth.
 *
 * @see specs/096-user-design-version/spec.md
 */

export const DESIGN_VERSION_LEGACY = 1;
export const DESIGN_VERSION_CURRENT_DEFAULT = 2;
