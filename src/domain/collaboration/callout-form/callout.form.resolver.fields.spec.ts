import { CalloutFormResponseMode } from '@common/enums/callout.form.response.mode';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutFormState } from '@common/enums/callout.form.state';
import { ICalloutForm } from './callout.form.interface';
import { CalloutFormResolverFields } from './callout.form.resolver.fields';

describe('CalloutFormResolverFields', () => {
  const resolver = new CalloutFormResolverFields();
  const form = (defaultCollapsed: boolean | null | undefined) =>
    ({
      id: 'form',
      questions: [],
      visibility: CalloutFormResponseVisibility.MEMBERS,
      responseMode: CalloutFormResponseMode.MULTIPLE,
      state: CalloutFormState.CLOSED,
      defaultCollapsed,
    }) as unknown as ICalloutForm;

  it.each([
    [null, false],
    [undefined, false],
    [false, false],
    [true, true],
  ])('settings.defaultCollapsed for a stored %s resolves %s', (stored, resolved) => {
    expect(resolver.settings(form(stored))).toEqual({
      visibility: CalloutFormResponseVisibility.MEMBERS,
      responseMode: CalloutFormResponseMode.MULTIPLE,
      state: CalloutFormState.CLOSED,
      defaultCollapsed: resolved,
    });
  });
});
