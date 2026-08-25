import { SidebarWidget } from '@common/enums/sidebar.widget';
import {
  bootstrapTemplateSpaceContentSpaceL0,
  FlowState,
} from './bootstrap.template.space.content.space.l0';

// Structural verification that the platform default L0 template declares explicit
// per-tab sidebar lists reproducing today's four tab variants, so fresh installs and
// newly bootstrapped L0 spaces don't depend on the backfill migration for correctness.
describe('bootstrapTemplateSpaceContentSpaceL0 — sidebar defaults', () => {
  const states =
    bootstrapTemplateSpaceContentSpaceL0.collaborationData?.innovationFlowData
      ?.states ?? [];

  const findState = (displayName: FlowState) =>
    states.find(s => s.displayName === displayName);

  it('gives Home the full first-tab widget set, in order', () => {
    expect(findState(FlowState.HOME)?.settings?.sidebar).toEqual([
      SidebarWidget.INTENT,
      SidebarWidget.ABOUT,
      SidebarWidget.CREATE_POST,
      SidebarWidget.APPLICATION_BUTTON,
      SidebarWidget.SUBSPACE_LINKS,
      SidebarWidget.EVENTS,
      SidebarWidget.UPDATES,
    ]);
  });

  it('gives Community the second-tab widget set, in order', () => {
    expect(findState(FlowState.COMMUNITY)?.settings?.sidebar).toEqual([
      SidebarWidget.CREATE_POST,
      SidebarWidget.APPLICATION_BUTTON,
      SidebarWidget.INTENT,
      SidebarWidget.CONTACT_LEADS,
      SidebarWidget.ADD_USER,
      SidebarWidget.VIRTUAL_CONTRIBUTORS,
      SidebarWidget.GUIDELINES,
    ]);
  });

  it('gives Subspaces the third-tab widget set, in order', () => {
    expect(findState(FlowState.SUBSPACES)?.settings?.sidebar).toEqual([
      SidebarWidget.CREATE_POST,
      SidebarWidget.APPLICATION_BUTTON,
      SidebarWidget.INTENT,
    ]);
  });

  it('gives Knowledge the generic default', () => {
    expect(findState(FlowState.KNOWLEDGE)?.settings?.sidebar).toEqual([
      SidebarWidget.CREATE_POST,
      SidebarWidget.APPLICATION_BUTTON,
      SidebarWidget.INTENT,
      SidebarWidget.INDEX,
    ]);
  });

  it('sets allowNewCallouts: true on every state now that each carries a settings block', () => {
    for (const flowState of Object.values(FlowState)) {
      expect(findState(flowState)?.settings?.allowNewCallouts).toBe(true);
    }
  });
});
