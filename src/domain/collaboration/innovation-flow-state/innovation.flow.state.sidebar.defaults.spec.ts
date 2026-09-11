import { SidebarWidget } from '@common/enums/sidebar.widget';
import {
  insertSearchWidget,
  SIDEBAR_DEFAULT_GENERIC,
  SIDEBAR_DEFAULT_L0_TAB_1,
  SIDEBAR_DEFAULT_L0_TAB_2,
  SIDEBAR_DEFAULT_L0_TAB_3,
} from './innovation.flow.state.sidebar.defaults';

const {
  INTENT,
  ABOUT,
  CREATE_POST,
  APPLICATION_BUTTON,
  CREATE_SUBSPACE,
  SUBSPACE_LINKS,
  EVENTS,
  UPDATES,
  CONTACT_LEADS,
  ADD_USER,
  VIRTUAL_CONTRIBUTORS,
  GUIDELINES,
  INDEX,
  SEARCH,
} = SidebarWidget;

describe('insertSearchWidget — the search placement rule', () => {
  // The same truth table the AddSearchSidebarWidget migration documents and
  // that its SQL was verified against on a real PostgreSQL. Rule: (a) before
  // the first `index`; (b) else after the last `createSubspace`/`createPost`;
  // (c) else appended.
  const truthTable: [SidebarWidget[], SidebarWidget[]][] = [
    [
      [
        INTENT,
        ABOUT,
        CREATE_POST,
        APPLICATION_BUTTON,
        SUBSPACE_LINKS,
        EVENTS,
        UPDATES,
      ],
      [
        INTENT,
        ABOUT,
        CREATE_POST,
        SEARCH,
        APPLICATION_BUTTON,
        SUBSPACE_LINKS,
        EVENTS,
        UPDATES,
      ],
    ],
    [
      [
        INTENT,
        CREATE_POST,
        APPLICATION_BUTTON,
        CONTACT_LEADS,
        ADD_USER,
        VIRTUAL_CONTRIBUTORS,
        GUIDELINES,
      ],
      [
        INTENT,
        CREATE_POST,
        SEARCH,
        APPLICATION_BUTTON,
        CONTACT_LEADS,
        ADD_USER,
        VIRTUAL_CONTRIBUTORS,
        GUIDELINES,
      ],
    ],
    [
      [INTENT, CREATE_SUBSPACE, CREATE_POST, APPLICATION_BUTTON],
      [INTENT, CREATE_SUBSPACE, CREATE_POST, SEARCH, APPLICATION_BUTTON],
    ],
    [
      [INTENT, CREATE_POST, APPLICATION_BUTTON, INDEX],
      [INTENT, CREATE_POST, APPLICATION_BUTTON, SEARCH, INDEX],
    ],
    // idempotent
    [
      [INTENT, SEARCH, INDEX],
      [INTENT, SEARCH, INDEX],
    ],
    // (c) no anchor at all → appended
    [
      [INTENT, ABOUT, EVENTS],
      [INTENT, ABOUT, EVENTS, SEARCH],
    ],
    // (a) `index` first → search becomes the very first widget
    [
      [INDEX, INTENT],
      [SEARCH, INDEX, INTENT],
    ],
    // (b) after the LAST create button, whichever it is
    [
      [INTENT, CREATE_POST, CREATE_SUBSPACE],
      [INTENT, CREATE_POST, CREATE_SUBSPACE, SEARCH],
    ],
    // (a) wins over (b) even when a create button follows the index
    [
      [CREATE_POST, INDEX, CREATE_SUBSPACE],
      [CREATE_POST, SEARCH, INDEX, CREATE_SUBSPACE],
    ],
  ];

  it.each(truthTable)('%j -> %j', (input, expected) => {
    expect(insertSearchWidget(input)).toEqual(expected);
  });

  it('never mutates its input', () => {
    const input = Object.freeze([INTENT, INDEX]);
    expect(insertSearchWidget(input)).toEqual([INTENT, SEARCH, INDEX]);
    expect(input).toEqual([INTENT, INDEX]);
  });

  it('applies rule (c) to an empty list — the migration skips [] as policy, on top of the rule', () => {
    expect(insertSearchWidget([])).toEqual([SEARCH]);
  });
});

describe('SIDEBAR_DEFAULT_* literals follow the placement rule', () => {
  const withoutSearch = (list: readonly SidebarWidget[]) =>
    list.filter(widget => widget !== SEARCH);

  it.each([
    ['SIDEBAR_DEFAULT_L0_TAB_1', SIDEBAR_DEFAULT_L0_TAB_1],
    ['SIDEBAR_DEFAULT_L0_TAB_2', SIDEBAR_DEFAULT_L0_TAB_2],
    ['SIDEBAR_DEFAULT_L0_TAB_3', SIDEBAR_DEFAULT_L0_TAB_3],
    ['SIDEBAR_DEFAULT_GENERIC', SIDEBAR_DEFAULT_GENERIC],
  ])('%s equals its pre-search shape with search inserted by the rule', (_name, literal) => {
    expect(literal).toContain(SEARCH);
    expect(insertSearchWidget(withoutSearch(literal))).toEqual([...literal]);
  });
});
