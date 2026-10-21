import { IInnovationFlowStateSettings } from '../../innovation-flow-state-settings/innovation.flow.settings.interface';

/**
 * Returns a fresh settings object equal to `settings` with ONLY its `sidebar` key replaced by
 * the raw stored value `sidebar` — moved verbatim, never read-normalized, so values outside
 * this server's vocabulary survive. An `undefined` sidebar removes the key (a row that had
 * no list keeps having none). Every other setting is left untouched.
 */
export const withRawSidebar = (
  settings: IInnovationFlowStateSettings | undefined,
  sidebar: IInnovationFlowStateSettings['sidebar'] | undefined
): IInnovationFlowStateSettings => {
  const { sidebar: _replaced, ...rest } =
    settings ?? ({} as Partial<IInnovationFlowStateSettings>);
  return (
    sidebar === undefined ? rest : { ...rest, sidebar }
  ) as IInnovationFlowStateSettings;
};
