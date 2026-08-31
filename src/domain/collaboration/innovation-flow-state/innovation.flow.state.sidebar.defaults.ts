import { SidebarWidget } from '@common/enums/sidebar.widget';

/**
 * The single source of truth for default per-tab sidebar widget lists, reproducing what
 * each L0 space tab renders today by position within its InnovationFlow (1st = Home,
 * 2nd = Community, 3rd = Subspaces, 4th+ = custom/Knowledge). Consumed by the backfill
 * migration's SQL literals (kept in sync there, since migrations must stay self-contained),
 * the bootstrap L0 template, the create-path default, and the read-normalization fallback.
 *
 * Placement of `search` within a list follows one content-based rule, applied wherever a
 * list is built or repaired: (a) immediately before the first `index`, if present; (b) else
 * immediately after the last `createSubspace`/`createPost`, if either is present; (c) else
 * appended at the end. The same rule (not just the same literal outcome) also drives the
 * data migration that inserts `search` into stored lists that predate it.
 *
 * Frozen so callers never mutate a shared array by reference — always spread
 * (`[...SIDEBAR_DEFAULT_GENERIC]`) before assigning to a state's settings.
 */
export const SIDEBAR_DEFAULT_L0_TAB_1: readonly SidebarWidget[] = Object.freeze(
  [
    SidebarWidget.INTENT,
    SidebarWidget.ABOUT,
    SidebarWidget.CREATE_POST,
    SidebarWidget.SEARCH,
    SidebarWidget.APPLICATION_BUTTON,
    SidebarWidget.SUBSPACE_LINKS,
    SidebarWidget.EVENTS,
    SidebarWidget.UPDATES,
  ]
);

export const SIDEBAR_DEFAULT_L0_TAB_2: readonly SidebarWidget[] = Object.freeze(
  [
    SidebarWidget.INTENT,
    SidebarWidget.CREATE_POST,
    SidebarWidget.SEARCH,
    SidebarWidget.APPLICATION_BUTTON,
    SidebarWidget.CONTACT_LEADS,
    SidebarWidget.ADD_USER,
    SidebarWidget.VIRTUAL_CONTRIBUTORS,
    SidebarWidget.GUIDELINES,
  ]
);

export const SIDEBAR_DEFAULT_L0_TAB_3: readonly SidebarWidget[] = Object.freeze(
  [
    SidebarWidget.INTENT,
    SidebarWidget.CREATE_SUBSPACE,
    SidebarWidget.CREATE_POST,
    SidebarWidget.SEARCH,
    SidebarWidget.APPLICATION_BUTTON,
  ]
);

// Also used as: the create-path default for a state with no explicit sidebar, the
// read-normalization fallback for a row missing the key, and the L0 4th+/subspace/orphan
// backfill default.
export const SIDEBAR_DEFAULT_GENERIC: readonly SidebarWidget[] = Object.freeze([
  SidebarWidget.INTENT,
  SidebarWidget.CREATE_POST,
  SidebarWidget.APPLICATION_BUTTON,
  SidebarWidget.SEARCH,
  SidebarWidget.INDEX,
]);
