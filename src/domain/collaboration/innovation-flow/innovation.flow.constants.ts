/**
 * Bounds for the number of InnovationFlow states (tabs) a Space may hold,
 * applied at Space creation time and read by the generic add/delete guards in
 * {@link InnovationFlowService}.
 *
 * History: story #6177 (epic alkem-io/alkemio#1930) loosened the L0 maximum
 * from 4 to 8 while keeping the minimum at 4 (the "fixed phases" floor).
 * client-web#9528 then removed the L0 floor entirely: L0 spaces and subspaces
 * now share the same 1..8 allowance, and promoting a subspace to L0 keeps its
 * states verbatim. The per-flow `settings.minimumNumberOfStates` /
 * `settings.maximumNumberOfStates` enforcement machinery is deliberately kept
 * in place so the bounds can be tightened again by only changing these
 * constants (plus a data backfill).
 */

/** L0 (root space) minimum number of states. */
export const L0_MIN_INNOVATION_FLOW_STATES = 1;

/** L0 (root space) maximum number of states. */
export const L0_MAX_INNOVATION_FLOW_STATES = 8;

/**
 * The count of leading "fixed phases" on an L0 space that a template apply
 * must preserve (identity, description, position). Set to 0 since
 * client-web#9528: L0 spaces no longer have fixed phases, so applying a
 * template replaces all states — the same behavior as subspaces. The
 * preservation mechanism in
 * {@link InnovationFlowService.updateInnovationFlowStatesFromTemplate} is kept
 * and degrades to a no-op at 0; restore a value > 0 to re-enable it.
 */
export const L0_FIXED_INNOVATION_FLOW_STATES = 0;

/** Subspace (L1/L2) minimum number of states. */
export const SUBSPACE_MIN_INNOVATION_FLOW_STATES = 1;

/** Subspace (L1/L2) maximum number of states. */
export const SUBSPACE_MAX_INNOVATION_FLOW_STATES = 8;
