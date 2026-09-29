import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { CALLOUT_FORM_OWNER_RELATIONS } from '@domain/collaboration/callout-form/callout.form.owner.relations';
import { FormResponseAccessService } from '@domain/collaboration/callout-form/callout.form.response.access.service';
import { CalloutFormService } from '@domain/collaboration/callout-form/callout.form.service';
import { CalloutFormResponseService } from '@domain/collaboration/callout-form-response/callout.form.response.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { LookupResolverFields } from './lookup.resolver.fields';

describe('LookupResolverFields.calloutFormResponses', () => {
  let resolver: LookupResolverFields;
  let calloutFormService: CalloutFormService;
  let calloutFormResponseService: CalloutFormResponseService;
  let formResponseAccess: FormResponseAccessService;

  const actorContext = { actorID: 'actor-1', credentials: [] } as any;
  const form = { id: 'form-1', visibility: 'admins' } as any;
  const callout = { id: 'callout-1' } as any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LookupResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(LookupResolverFields);
    calloutFormService = module.get(CalloutFormService);
    calloutFormResponseService = module.get(CalloutFormResponseService);
    formResponseAccess = module.get(FormResponseAccessService);

    vi.mocked(calloutFormService.getCalloutFormOrFail).mockResolvedValue(form);
    vi.mocked(calloutFormService.getCalloutForFormOrFail).mockResolvedValue(
      callout
    );
    vi.mocked(calloutFormResponseService.clampPageSize).mockImplementation(
      (first?: number | null) => Math.min(Math.max(first ?? 25, 1), 50)
    );
    vi.mocked(formResponseAccess.canModerate).mockReturnValue(false);
  });

  it('loads the callout with the relations the access owner needs and resolves the scope once', async () => {
    vi.mocked(formResponseAccess.resolveScope).mockResolvedValue('OWN');

    const view = await resolver.calloutFormResponses(
      actorContext,
      'form-1',
      500,
      'cursor-1'
    );

    expect(calloutFormService.getCalloutForFormOrFail).toHaveBeenCalledWith(
      'form-1',
      CALLOUT_FORM_OWNER_RELATIONS
    );
    expect(formResponseAccess.resolveScope).toHaveBeenCalledTimes(1);
    expect(formResponseAccess.resolveScope).toHaveBeenCalledWith(
      actorContext,
      form,
      callout
    );
    expect(view).toEqual({
      formID: 'form-1',
      scope: 'OWN',
      actorID: 'actor-1',
      first: 50, // clamped
      after: 'cursor-1',
      canModerate: false,
    });
  });

  it('carries the moderation flag from the access owner', async () => {
    vi.mocked(formResponseAccess.resolveScope).mockResolvedValue('ALL');
    vi.mocked(formResponseAccess.canModerate).mockReturnValue(true);
    const view = await resolver.calloutFormResponses(actorContext, 'form-1');
    expect(view.canModerate).toBe(true);
    expect(view.first).toBe(25);
  });

  it('propagates the forbidden error when the Post itself cannot be read', async () => {
    vi.mocked(formResponseAccess.resolveScope).mockRejectedValue(
      new ForbiddenAuthorizationPolicyException(
        'no',
        'read' as any,
        'auth-1',
        'actor-1'
      )
    );
    await expect(
      resolver.calloutFormResponses(actorContext, 'form-1')
    ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);
  });
});
