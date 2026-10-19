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
/**
 * The placement rule for `search`, as executable code: returns a copy of `list` with `search`
 * inserted (a) immediately before the first `index`, else (b) immediately after the last
 * `createSubspace`/`createPost`, else (c) appended. A list already containing `search` is
 * returned unchanged (idempotent). This is the single definition the four default literals
 * below are checked against, and the reference the migration's SQL is meant to reproduce
 * (the migration additionally skips `[]` — a policy on top of the rule, not part of it).
 */
export const insertSearchWidget = (
  list: readonly SidebarWidget[]
): SidebarWidget[] => {
  if (list.includes(SidebarWidget.SEARCH)) {
    return [...list];
  }
  const firstIndex = list.indexOf(SidebarWidget.INDEX);
  if (firstIndex >= 0) {
    return [
      ...list.slice(0, firstIndex),
      SidebarWidget.SEARCH,
      ...list.slice(firstIndex),
    ];
  }
  const lastCreateButton = Math.max(
    list.lastIndexOf(SidebarWidget.CREATE_SUBSPACE),
    list.lastIndexOf(SidebarWidget.CREATE_POST)
  );
  if (lastCreateButton >= 0) {
    return [
      ...list.slice(0, lastCreateButton + 1),
      SidebarWidget.SEARCH,
      ...list.slice(lastCreateButton + 1),
    ];
  }
  return [...list, SidebarWidget.SEARCH];
};

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
// read-normalization fallback for a row missing the key, the L0 4th+/orphan backfill
// default, and the subspace 4th+ positional default.
export const SIDEBAR_DEFAULT_GENERIC: readonly SidebarWidget[] = Object.freeze([
  SidebarWidget.INTENT,
  SidebarWidget.CREATE_POST,
  SidebarWidget.APPLICATION_BUTTON,
  SidebarWidget.SEARCH,
  SidebarWidget.INDEX,
]);

/**
 * The sidebar of the first phase of a subspace (L1/L2) flow, reproducing the subspace page's
 * previously hard-coded sidebar in its DOM order: the info block, About, Add Post, the Quick
 * Actions (Community, Events, Recent Activity, Post Index), the nested subspaces, the virtual
 * contributor card and the latest update. It deliberately contains NO `search`: that sidebar
 * never had one, so adding it would be a visible change for every untouched subspace.
 */
export const SIDEBAR_DEFAULT_SUBSPACE: readonly SidebarWidget[] = Object.freeze(
  [
    SidebarWidget.INTENT,
    SidebarWidget.ABOUT,
    SidebarWidget.CREATE_POST,
    SidebarWidget.COMMUNITY,
    SidebarWidget.EVENTS,
    SidebarWidget.ACTIVITY,
    SidebarWidget.INDEX,
    SidebarWidget.SUBSPACE_LINKS,
    SidebarWidget.VIRTUAL_CONTRIBUTORS,
    SidebarWidget.UPDATES,
  ]
);

/**
 * Positional defaults for the phases of a subspace (L1/L2) flow, by 1-based position in
 * `(sortOrder, id)` order: 1 → the subspace sidebar (the one every phase of a subspace shows),
 * 2 → the L0 tab-2 list, 3 → the L0 tab-3 list, 4+ → the generic list. Positions 2+ only
 * matter when a subspace template is applied to, or a subspace converted into, a top-level
 * Space — they give those tabs sensible lists.
 *
 * Consumers: the bootstrap subspace template and the static spec of the migration that
 * rewrites untouched subspace flows (its SQL literals must equal this output). The creation
 * funnel deliberately keeps SIDEBAR_DEFAULT_GENERIC for a state with no explicit list:
 * subspaces are created by copying a template's phases, whose lists are copied verbatim.
 */
export const resolveSubspaceDefaultSidebar = (
  position: number
): readonly SidebarWidget[] => {
  if (position <= 1) return SIDEBAR_DEFAULT_SUBSPACE;
  if (position === 2) return SIDEBAR_DEFAULT_L0_TAB_2;
  if (position === 3) return SIDEBAR_DEFAULT_L0_TAB_3;
  return SIDEBAR_DEFAULT_GENERIC;
};
