import {
  resolveSubspaceDefaultSidebar,
  SIDEBAR_DEFAULT_SUBSPACE,
} from '@domain/collaboration/innovation-flow-state/innovation.flow.state.sidebar.defaults';
import {
  bootstrapTemplateSpaceContentSubspace,
  FlowState,
} from './bootstrap.template.space.content.subspace';

// Structural verification that the platform subspace template declares the positional
// subspace sidebar lists on its states, so fresh installs and subspaces created from it
// render the subspace sidebar without depending on a data migration. The create funnel
// assigns ascending sort orders in array order, so array index k is position k + 1.
describe('bootstrapTemplateSpaceContentSubspace — sidebar defaults', () => {
  const states =
    bootstrapTemplateSpaceContentSubspace.collaborationData?.innovationFlowData
      ?.states ?? [];

  it('keeps its five states in the documented order', () => {
    expect(states.map(s => s.displayName)).toEqual([
      FlowState.EXPLORE,
      FlowState.DEFINE,
      FlowState.BRAINSTORM,
      FlowState.VALIDATE,
      FlowState.EVALUATE,
    ]);
  });

  it.each([
    0, 1, 2, 3, 4,
  ])('state %i carries the positional default for its position', index => {
    expect(states[index].settings?.sidebar).toEqual([
      ...resolveSubspaceDefaultSidebar(index + 1),
    ]);
  });

  it('gives the first state the subspace sidebar', () => {
    expect(states[0].settings?.sidebar).toEqual([...SIDEBAR_DEFAULT_SUBSPACE]);
  });

  it('never assigns a shared frozen default array', () => {
    for (const state of states) {
      expect(state.settings?.sidebar).toBeDefined();
      expect(Object.isFrozen(state.settings?.sidebar)).toBe(false);
    }
  });

  it('keeps allowNewCallouts enabled on every state', () => {
    for (const state of states) {
      expect(state.settings?.allowNewCallouts).toBe(true);
    }
  });
});
