import { CalloutFormResponseService } from '../callout-form-response/callout.form.response.service';
import {
  CalloutFormResponsesScope,
  ICalloutFormResponses,
} from '../callout-form-response/dto/callout.form.responses.view';
import { CalloutFormResponsesResolverFields } from './callout.form.responses.resolver.fields';

describe('CalloutFormResponsesResolverFields', () => {
  const responseService = {
    findMine: vi.fn(),
    paginate: vi.fn(),
  };
  let resolver: CalloutFormResponsesResolverFields;

  const view = (
    scope: CalloutFormResponsesScope,
    overrides: Partial<ICalloutFormResponses> = {}
  ): ICalloutFormResponses => ({
    formID: 'form-1',
    scope,
    actorID: 'actor-1',
    first: 25,
    after: undefined,
    canModerate: false,
    ...overrides,
  });

  beforeEach(() => {
    vi.resetAllMocks();
    resolver = new CalloutFormResponsesResolverFields(
      responseService as unknown as CalloutFormResponseService
    );
  });

  it.each([
    ['ALL', true],
    ['OWN', false],
    ['NONE', false],
  ] as const)('canReadAll for scope %s is %s', (scope, expected) => {
    expect(resolver.canReadAll(view(scope))).toBe(expected);
  });

  it('exposes the moderation flag the lookup computed, independent of the read scope', () => {
    expect(resolver.canModerate(view('OWN', { canModerate: true }))).toBe(true);
    expect(resolver.canModerate(view('ALL', { canModerate: false }))).toBe(
      false
    );
  });

  it("returns the viewer's own responses through the service", async () => {
    responseService.findMine.mockResolvedValue([{ id: 'r1' }]);
    expect(await resolver.mine(view('OWN'))).toEqual([{ id: 'r1' }]);
    expect(responseService.findMine).toHaveBeenCalledWith('form-1', 'actor-1');
  });

  it('pages with the scope, actor, page size and cursor of the view', async () => {
    const page = { items: [], total: 0, pageInfo: {} };
    responseService.paginate.mockResolvedValue(page);
    expect(await resolver.all(view('OWN', { first: 10, after: 'c1' }))).toBe(
      page
    );
    expect(responseService.paginate).toHaveBeenCalledWith(
      'form-1',
      'OWN',
      'actor-1',
      10,
      'c1'
    );
  });
});
