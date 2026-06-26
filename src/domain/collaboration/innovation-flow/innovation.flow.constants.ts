/**
 * Bounds for the number of InnovationFlow states (tabs) a Space may hold,
 * applied at Space creation time and read by the generic add/delete guards in
 * {@link InnovationFlowService}.
 *
 * Single source of truth for story #6177 (epic alkem-io/alkemio#1930): L0 spaces
 * were previously pinned to exactly 4 states (min 4 / max 4). They now allow up
 * to the same maximum as subspaces (8) so admins can add tabs beyond the fixed 4
 * (FR-001), while the minimum stays 4 so the first 4 fixed phases can never be
 * removed (FR-002, FR-010).
 */

/** L0 (root space) minimum — keeps the 4 fixed phases as an undeletable floor. */
export const L0_MIN_INNOVATION_FLOW_STATES = 4;

/** L0 (root space) maximum — matches the subspace allowance so tabs can be added. */
export const L0_MAX_INNOVATION_FLOW_STATES = 8;

/**
 * The count of fixed phases on an L0 space (the leading states a template apply
 * must preserve). Equal to the L0 minimum by definition.
 */
export const L0_FIXED_INNOVATION_FLOW_STATES = L0_MIN_INNOVATION_FLOW_STATES;

/** Subspace (L1/L2) minimum number of states. */
export const SUBSPACE_MIN_INNOVATION_FLOW_STATES = 1;

/** Subspace (L1/L2) maximum number of states. */
export const SUBSPACE_MAX_INNOVATION_FLOW_STATES = 8;
