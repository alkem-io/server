import { SidebarWidget } from '@common/enums/sidebar.widget';
import { validate } from 'class-validator';
import { UpdateInnovationFlowStateSettingsInput } from './innovation.flow.state.settings.dto.update';

describe('UpdateInnovationFlowStateSettingsInput — sidebar validation', () => {
  it('accepts omission (partial update leaves the stored value unchanged)', async () => {
    const input = new UpdateInnovationFlowStateSettingsInput();

    const errors = await validate(input);

    expect(errors.filter(e => e.property === 'sidebar')).toHaveLength(0);
  });

  it('accepts an empty list', async () => {
    const input = new UpdateInnovationFlowStateSettingsInput();
    input.sidebar = [];

    const errors = await validate(input);

    expect(errors.filter(e => e.property === 'sidebar')).toHaveLength(0);
  });

  it('accepts a valid ordered list from the vocabulary', async () => {
    const input = new UpdateInnovationFlowStateSettingsInput();
    input.sidebar = [SidebarWidget.EVENTS, SidebarWidget.INTENT];

    const errors = await validate(input);

    expect(errors.filter(e => e.property === 'sidebar')).toHaveLength(0);
  });

  it('rejects duplicate entries', async () => {
    const input = new UpdateInnovationFlowStateSettingsInput();
    input.sidebar = [SidebarWidget.INTENT, SidebarWidget.INTENT];

    const errors = await validate(input);

    expect(errors.some(e => e.property === 'sidebar')).toBe(true);
  });

  it('rejects a list of 21 entries (over the size bound)', async () => {
    const input = new UpdateInnovationFlowStateSettingsInput();
    // Vocabulary is 10; repeat allowed values to reach 21 without the dupe check
    // masking which constraint fired — the @ArrayMaxSize decorator alone is asserted.
    const values = Object.values(SidebarWidget);
    input.sidebar = Array.from(
      { length: 21 },
      (_, i) => values[i % values.length]
    );

    const errors = await validate(input);

    const sidebarError = errors.find(e => e.property === 'sidebar');
    expect(sidebarError?.constraints).toHaveProperty('arrayMaxSize');
  });

  it('rejects a literal outside the enum', async () => {
    const input = new UpdateInnovationFlowStateSettingsInput();
    (input as any).sidebar = ['notAWidget'];

    const errors = await validate(input);

    expect(errors.some(e => e.property === 'sidebar')).toBe(true);
  });
});
