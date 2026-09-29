import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { LogContext } from '@common/enums/logging.context';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { CALLOUT_FORM_OWNER_RELATIONS } from './callout.form.owner.relations';
import { CalloutFormResolverMutations } from './callout.form.resolver.mutations';

const forbidden = () =>
  new ForbiddenAuthorizationPolicyException(
    'no',
    AuthorizationPrivilege.CREATE,
    'auth',
    'actor'
  );

describe('CalloutFormResolverMutations', () => {
  const authorizationService = { grantAccessOrFail: vi.fn() };
  const formResponseAccess = { assertCanModerate: vi.fn() };
  const calloutFormService = {
    getCalloutForFormOrFail: vi.fn(),
    updateCalloutForm: vi.fn(),
  };
  const responseService = {
    submitResponse: vi.fn(),
    getResponseOrFail: vi.fn(),
    deleteResponse: vi.fn(),
  };
  const notificationAdapter = {
    spaceCollaborationCalloutFormResponseSubmitted: vi.fn(),
  };
  const logger = { error: vi.fn() };
  let resolver: CalloutFormResolverMutations;

  const actor = { actorID: 'actor-1', credentials: [] } as any;
  const callout = {
    id: 'callout-1',
    authorization: { id: 'callout-auth' },
    settings: { visibility: CalloutVisibility.PUBLISHED },
  } as any;

  beforeEach(() => {
    vi.resetAllMocks();
    calloutFormService.getCalloutForFormOrFail.mockResolvedValue(callout);
    notificationAdapter.spaceCollaborationCalloutFormResponseSubmitted.mockResolvedValue(
      undefined
    );
    resolver = new CalloutFormResolverMutations(
      authorizationService as any,
      formResponseAccess as any,
      calloutFormService as any,
      responseService as any,
      notificationAdapter as any,
      logger as any
    );
  });

  describe('updateCalloutForm', () => {
    const formData = { formID: 'form-1', settings: {} } as any;

    it('loads the owning Post with the access relations and delegates to the service for a moderator', async () => {
      calloutFormService.updateCalloutForm.mockResolvedValue({ id: 'form-1' });
      expect(await resolver.updateCalloutForm(actor, formData)).toEqual({
        id: 'form-1',
      });
      expect(calloutFormService.getCalloutForFormOrFail).toHaveBeenCalledWith(
        'form-1',
        CALLOUT_FORM_OWNER_RELATIONS
      );
      expect(formResponseAccess.assertCanModerate).toHaveBeenCalledWith(
        actor,
        callout
      );
    });

    it('is forbidden for a non-moderator and never reaches the service', async () => {
      formResponseAccess.assertCanModerate.mockImplementation(() => {
        throw forbidden();
      });
      await expect(
        resolver.updateCalloutForm(actor, formData)
      ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);
      expect(calloutFormService.updateCalloutForm).not.toHaveBeenCalled();
    });
  });

  describe('submitCalloutFormResponse', () => {
    const responseData = {
      formID: 'form-1',
      acknowledgedVisibility: CalloutFormResponseVisibility.ADMINS,
      answers: [{ questionID: 'q-1', text: 'SECRET-ANSWER' }],
    } as any;
    const stored = {
      response: {
        id: 'response-1',
        createdDate: new Date('2026-09-29T10:00:00Z'),
      },
      visibility: CalloutFormResponseVisibility.ADMINS,
    };

    it('requires CONTRIBUTE on the Post', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw forbidden();
      });
      await expect(
        resolver.submitCalloutFormResponse(actor, responseData)
      ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actor,
        callout.authorization,
        AuthorizationPrivilege.CONTRIBUTE,
        expect.any(String)
      );
      expect(responseService.submitResponse).not.toHaveBeenCalled();
      expect(
        notificationAdapter.spaceCollaborationCalloutFormResponseSubmitted
      ).not.toHaveBeenCalled();
    });

    it('stores the response, then dispatches the notifications exactly once with the locked visibility', async () => {
      const order: string[] = [];
      responseService.submitResponse.mockImplementation(async () => {
        order.push('stored');
        return stored;
      });
      notificationAdapter.spaceCollaborationCalloutFormResponseSubmitted.mockImplementation(
        async () => {
          order.push('notified');
        }
      );

      const result = await resolver.submitCalloutFormResponse(
        actor,
        responseData
      );

      expect(result).toBe(stored.response);
      expect(responseService.submitResponse).toHaveBeenCalledWith(
        'actor-1',
        CalloutVisibility.PUBLISHED,
        responseData
      );
      expect(order).toEqual(['stored', 'notified']);
      expect(
        notificationAdapter.spaceCollaborationCalloutFormResponseSubmitted
      ).toHaveBeenCalledTimes(1);
      expect(
        notificationAdapter.spaceCollaborationCalloutFormResponseSubmitted
      ).toHaveBeenCalledWith({
        triggeredBy: 'actor-1',
        callout,
        formID: 'form-1',
        response: stored.response,
        visibility: CalloutFormResponseVisibility.ADMINS,
      });
    });

    it('a rejecting notification never fails the mutation; the error is logged with ids only', async () => {
      responseService.submitResponse.mockResolvedValue(stored);
      notificationAdapter.spaceCollaborationCalloutFormResponseSubmitted.mockRejectedValue(
        new Error('broker down')
      );

      await expect(
        resolver.submitCalloutFormResponse(actor, responseData)
      ).resolves.toBe(stored.response);
      await new Promise(resolve => setImmediate(resolve));

      expect(logger.error).toHaveBeenCalledTimes(1);
      const [details, , context] = logger.error.mock.calls[0];
      expect(details).toEqual({
        message: 'Failed to dispatch form-response notifications',
        calloutID: 'callout-1',
        formID: 'form-1',
        responseID: 'response-1',
        event: 'SPACE_ADMIN_COLLABORATION_CALLOUT_FORM_RESPONSE',
      });
      expect(context).toBe(LogContext.NOTIFICATIONS);
      expect(JSON.stringify(logger.error.mock.calls)).not.toContain(
        'SECRET-ANSWER'
      );
    });

    it('does not notify when the submission is rejected', async () => {
      responseService.submitResponse.mockRejectedValue(
        new Error('FORM_CLOSED')
      );
      await expect(
        resolver.submitCalloutFormResponse(actor, responseData)
      ).rejects.toThrow('FORM_CLOSED');
      expect(
        notificationAdapter.spaceCollaborationCalloutFormResponseSubmitted
      ).not.toHaveBeenCalled();
    });
  });

  describe('deleteCalloutFormResponse', () => {
    const deleteData = { responseID: 'response-1' } as any;
    const response = (createdBy: string | null) => ({
      id: 'response-1',
      formId: 'form-1',
      createdBy,
    });

    beforeEach(() => {
      responseService.deleteResponse.mockResolvedValue({ id: 'response-1' });
    });

    it('lets the owner withdraw without any moderation check or Post load', async () => {
      responseService.getResponseOrFail.mockResolvedValue(response('actor-1'));
      await resolver.deleteCalloutFormResponse(actor, deleteData);
      expect(responseService.deleteResponse).toHaveBeenCalledWith('response-1');
      expect(formResponseAccess.assertCanModerate).not.toHaveBeenCalled();
      expect(calloutFormService.getCalloutForFormOrFail).not.toHaveBeenCalled();
    });

    it('lets a moderator delete someone else’s response, checked on the Post that owns the Form', async () => {
      responseService.getResponseOrFail.mockResolvedValue(response('someone'));
      await resolver.deleteCalloutFormResponse(actor, deleteData);
      expect(calloutFormService.getCalloutForFormOrFail).toHaveBeenCalledWith(
        'form-1',
        CALLOUT_FORM_OWNER_RELATIONS
      );
      expect(formResponseAccess.assertCanModerate).toHaveBeenCalledWith(
        actor,
        callout
      );
      expect(responseService.deleteResponse).toHaveBeenCalledWith('response-1');
    });

    it.each([
      ['another non-admin member', actor, 'someone'],
      [
        'an anonymous caller',
        { actorID: '', credentials: [] } as any,
        'someone',
      ],
      [
        'anyone when the submitter account is gone (createdBy null)',
        actor,
        null,
      ],
      [
        'an anonymous caller against a response of a deleted user',
        { actorID: '', credentials: [] } as any,
        null,
      ],
    ])('forbids %s', async (_name, caller, createdBy) => {
      responseService.getResponseOrFail.mockResolvedValue(response(createdBy));
      formResponseAccess.assertCanModerate.mockImplementation(() => {
        throw forbidden();
      });
      await expect(
        resolver.deleteCalloutFormResponse(caller, deleteData)
      ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);
      expect(responseService.deleteResponse).not.toHaveBeenCalled();
    });
  });
});
