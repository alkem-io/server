import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { SidebarWidget } from '@common/enums/sidebar.widget';
import { IInnovationFlowState } from './innovation.flow.state.interface';
import { normalizeStateSettings } from './normalize.state.settings';

const buildState = (
  settings?: Partial<IInnovationFlowState['settings']>
): IInnovationFlowState =>
  ({
    id: 'state-1',
    settings: settings as IInnovationFlowState['settings'],
  }) as IInnovationFlowState;

describe('normalizeStateSettings — sidebar', () => {
  it('defaults sidebar to [INTENT, CREATE_POST, APPLICATION_BUTTON, SEARCH, INDEX] when the key is missing on an existing settings object', () => {
    const state = buildState({ allowNewCallouts: true });

    const result = normalizeStateSettings(state);

    expect(result.settings.sidebar).toEqual([
      SidebarWidget.INTENT,
      SidebarWidget.CREATE_POST,
      SidebarWidget.APPLICATION_BUTTON,
      SidebarWidget.SEARCH,
      SidebarWidget.INDEX,
    ]);
  });

  it('defaults sidebar to [INTENT, CREATE_POST, APPLICATION_BUTTON, SEARCH, INDEX] when settings is entirely absent', () => {
    const state = { id: 'state-1' } as IInnovationFlowState;

    const result = normalizeStateSettings(state);

    expect(result.settings.sidebar).toEqual([
      SidebarWidget.INTENT,
      SidebarWidget.CREATE_POST,
      SidebarWidget.APPLICATION_BUTTON,
      SidebarWidget.SEARCH,
      SidebarWidget.INDEX,
    ]);
  });

  it('filters out entries outside the known vocabulary, keeping the rest in order', () => {
    const state = buildState({
      sidebar: [
        SidebarWidget.EVENTS,
        'notAWidget' as SidebarWidget,
        SidebarWidget.INTENT,
      ],
    });

    const result = normalizeStateSettings(state);

    expect(result.settings.sidebar).toEqual([
      SidebarWidget.EVENTS,
      SidebarWidget.INTENT,
    ]);
  });

  it('dedupes stored duplicates, keeping the first occurrence and its position', () => {
    const state = buildState({
      sidebar: [
        SidebarWidget.INTENT,
        SidebarWidget.EVENTS,
        SidebarWidget.INTENT,
      ],
    });

    const result = normalizeStateSettings(state);

    expect(result.settings.sidebar).toEqual([
      SidebarWidget.INTENT,
      SidebarWidget.EVENTS,
    ]);
  });

  it('preserves a valid empty array as-is', () => {
    const state = buildState({ sidebar: [] });

    const result = normalizeStateSettings(state);

    expect(result.settings.sidebar).toEqual([]);
  });

  it('leaves a valid, deduped array untouched in content and order', () => {
    const stored = [
      SidebarWidget.UPDATES,
      SidebarWidget.INTENT,
      SidebarWidget.ABOUT,
    ];
    const state = buildState({ sidebar: stored });

    const result = normalizeStateSettings(state);

    expect(result.settings.sidebar).toEqual(stored);
  });

  it('preserves a stored list containing search as a known value', () => {
    const stored = [
      SidebarWidget.INTENT,
      SidebarWidget.SEARCH,
      SidebarWidget.INDEX,
    ];
    const state = buildState({ sidebar: stored });

    const result = normalizeStateSettings(state);

    expect(result.settings.sidebar).toEqual(stored);
  });

  it('still defaults the existing four fields alongside sidebar', () => {
    const state = { id: 'state-1' } as IInnovationFlowState;

    const result = normalizeStateSettings(state);

    expect(result.settings.allowNewCallouts).toBe(true);
    expect(result.settings.visible).toBe(true);
    expect(result.settings.descriptionDisplayMode).toBe(
      CalloutDescriptionDisplayMode.EXPANDED
    );
    expect(result.settings.showPublishDetails).toBe(true);
  });
});
