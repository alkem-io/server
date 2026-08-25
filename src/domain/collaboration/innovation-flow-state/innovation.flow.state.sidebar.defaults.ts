import { SidebarWidget } from '@common/enums/sidebar.widget';

/**
 * The single source of truth for default per-tab sidebar widget lists, reproducing what
 * each L0 space tab renders today by position within its InnovationFlow (1st = Home,
 * 2nd = Community, 3rd = Subspaces, 4th+ = custom/Knowledge). Consumed by the backfill
 * migration's SQL literals (kept in sync there, since migrations must stay self-contained),
 * the bootstrap L0 template, the create-path default, and the read-normalization fallback.
 *
 * Frozen so callers never mutate a shared array by reference — always spread
 * (`[...SIDEBAR_DEFAULT_GENERIC]`) before assigning to a state's settings.
 */
export const SIDEBAR_DEFAULT_L0_TAB_1: readonly SidebarWidget[] = Object.freeze(
  [
    SidebarWidget.INTENT,
    SidebarWidget.ABOUT,
    SidebarWidget.CREATE_POST,
    SidebarWidget.APPLICATION_BUTTON,
    SidebarWidget.SUBSPACE_LINKS,
    SidebarWidget.EVENTS,
    SidebarWidget.UPDATES,
  ]
);

export const SIDEBAR_DEFAULT_L0_TAB_2: readonly SidebarWidget[] = Object.freeze(
  [
    SidebarWidget.CREATE_POST,
    SidebarWidget.APPLICATION_BUTTON,
    SidebarWidget.INTENT,
    SidebarWidget.CONTACT_LEADS,
    SidebarWidget.ADD_USER,
    SidebarWidget.VIRTUAL_CONTRIBUTORS,
    SidebarWidget.GUIDELINES,
  ]
);

export const SIDEBAR_DEFAULT_L0_TAB_3: readonly SidebarWidget[] = Object.freeze(
  [
    SidebarWidget.CREATE_POST,
    SidebarWidget.APPLICATION_BUTTON,
    SidebarWidget.INTENT,
  ]
);

// Also used as: the create-path default for a state with no explicit sidebar, the
// read-normalization fallback for a row missing the key, and the L0 4th+/subspace/orphan
// backfill default.
export const SIDEBAR_DEFAULT_GENERIC: readonly SidebarWidget[] = Object.freeze([
  SidebarWidget.CREATE_POST,
  SidebarWidget.APPLICATION_BUTTON,
  SidebarWidget.INTENT,
  SidebarWidget.INDEX,
]);
