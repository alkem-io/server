import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { IInnovationFlowState } from './innovation.flow.state.interface';

/**
 * FR-001 / research Decision 2 (risk R-4): every field of `InnovationFlowStateSettings` is
 * NonNull in GraphQL, but the underlying JSONB is only guaranteed to carry them once the
 * backfill migration (1783600000000) has run. A row missing a key would serialize `null`
 * into a NonNull field, and because `InnovationFlow.states` is `[InnovationFlowState!]!`
 * the error propagates up and takes out the whole flow — a 500 on the space page rather
 * than a graceful default.
 *
 * Apply this to EVERY path that hands an InnovationFlowState to the GraphQL layer, not just
 * the single-state-by-id lookups: the dominant read path (`InnovationFlow.states`) returns
 * raw TypeORM rows and never touched the old inline coercion. Keeping this as one shared
 * helper is what removes the (previously undocumented) migrate-before-deploy ordering
 * constraint.
 *
 * Mutates and returns the state so it can be used inline on a mapped array.
 */
export const normalizeStateSettings = (
  state: IInnovationFlowState
): IInnovationFlowState => {
  if (!state.settings) {
    state.settings = {
      allowNewCallouts: true,
      visible: true,
      descriptionDisplayMode: CalloutDescriptionDisplayMode.EXPANDED,
      showPublishDetails: true,
      // POC: forumMode is hardcoded true for every State.
      forumMode: true,
    };
    return state;
  }

  state.settings.allowNewCallouts = state.settings.allowNewCallouts ?? true;
  state.settings.visible = state.settings.visible ?? true;
  state.settings.descriptionDisplayMode =
    state.settings.descriptionDisplayMode ??
    CalloutDescriptionDisplayMode.EXPANDED;
  state.settings.showPublishDetails = state.settings.showPublishDetails ?? true;
  // POC: forumMode hardcoded true — always serialize true regardless of stored JSONB.
  state.settings.forumMode = true;

  return state;
};

export const normalizeStatesSettings = (
  states: IInnovationFlowState[]
): IInnovationFlowState[] => states.map(normalizeStateSettings);
