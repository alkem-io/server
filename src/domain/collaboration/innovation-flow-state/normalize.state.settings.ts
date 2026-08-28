import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { SidebarWidget } from '@common/enums/sidebar.widget';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { SIDEBAR_DEFAULT_GENERIC } from './innovation.flow.state.sidebar.defaults';

const KNOWN_SIDEBAR_WIDGETS = new Set<string>(Object.values(SidebarWidget));

/**
 * Defence-in-depth for a stored `sidebar` list: filters out anything outside the current
 * vocabulary (legacy data, hand-edited rows, a future server's wider vocabulary read by an
 * older one) and removes duplicates, keeping the first occurrence so order is preserved.
 * Never persists on its own — it only shapes what a read path serializes.
 */
const normalizeSidebar = (sidebar: unknown): SidebarWidget[] => {
  if (!Array.isArray(sidebar)) {
    return [...SIDEBAR_DEFAULT_GENERIC];
  }

  const seen = new Set<string>();
  const result: SidebarWidget[] = [];
  for (const entry of sidebar) {
    if (
      typeof entry === 'string' &&
      KNOWN_SIDEBAR_WIDGETS.has(entry) &&
      !seen.has(entry)
    ) {
      seen.add(entry);
      result.push(entry as SidebarWidget);
    }
  }
  return result;
};

/**
 * Every field of `InnovationFlowStateSettings` is NonNull in GraphQL, but the underlying
 * JSONB is only guaranteed to carry them once the relevant backfill migrations have run. A
 * row missing a key would serialize `null` into a NonNull field, and because
 * `InnovationFlow.states` is `[InnovationFlowState!]!` the error propagates up and takes out
 * the whole flow — a 500 on the space page rather than a graceful default.
 *
 * Apply this to EVERY path that hands an InnovationFlowState to the GraphQL layer, not just
 * the single-state-by-id lookups: the dominant read path (`InnovationFlow.states`) returns
 * raw TypeORM rows and never touched the old inline coercion. Keeping this as one shared
 * helper is what removes the (previously undocumented) migrate-before-deploy ordering
 * constraint.
 *
 * Mutates and returns the state so it can be used inline on a mapped array.
 *
 * PERSISTENCE WARNING: because this mutates the passed object, a write path must NEVER
 * repository.save() an entity that went through this helper — it would persist the
 * read-path filtering (e.g. strip a sidebar widget a newer release wrote, during a
 * rolling deploy). Write paths load raw (see getRawInnovationFlowStateOrFail) and
 * normalize only a detached copy for the API response.
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
      sidebar: [...SIDEBAR_DEFAULT_GENERIC],
    };
    return state;
  }

  state.settings.allowNewCallouts = state.settings.allowNewCallouts ?? true;
  state.settings.visible = state.settings.visible ?? true;
  state.settings.descriptionDisplayMode =
    state.settings.descriptionDisplayMode ??
    CalloutDescriptionDisplayMode.EXPANDED;
  state.settings.showPublishDetails = state.settings.showPublishDetails ?? true;
  state.settings.sidebar = normalizeSidebar(state.settings.sidebar);

  return state;
};

export const normalizeStatesSettings = (
  states: IInnovationFlowState[]
): IInnovationFlowState[] => states.map(normalizeStateSettings);
