import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { SidebarWidget } from '@common/enums/sidebar.widget';
import { IInnovationFlowStateSettings } from '../../innovation-flow-state-settings/innovation.flow.settings.interface';
import { withRawSidebar } from './withRawSidebar';

describe('withRawSidebar', () => {
  const settings: IInnovationFlowStateSettings = {
    allowNewCallouts: false,
    visible: false,
    descriptionDisplayMode: CalloutDescriptionDisplayMode.COLLAPSED,
    showPublishDetails: false,
    sidebar: [SidebarWidget.INTENT],
  };

  it('replaces only the sidebar key, verbatim (unknown values kept)', () => {
    const raw = ['zzz', SidebarWidget.INDEX] as SidebarWidget[];
    const result = withRawSidebar(settings, raw);
    expect(result).toEqual({ ...settings, sidebar: raw });
    expect(result.sidebar).toBe(raw);
  });

  it('removes the key when the raw value is undefined', () => {
    const result = withRawSidebar(settings, undefined);
    expect('sidebar' in result).toBe(false);
    expect(result.visible).toBe(false);
  });

  it('keeps an explicit empty list', () => {
    expect(withRawSidebar(settings, []).sidebar).toEqual([]);
  });

  it('never mutates its input and tolerates missing settings', () => {
    withRawSidebar(settings, []);
    expect(settings.sidebar).toEqual([SidebarWidget.INTENT]);
    expect(withRawSidebar(undefined, [SidebarWidget.ABOUT])).toEqual({
      sidebar: [SidebarWidget.ABOUT],
    });
  });
});
