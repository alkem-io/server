import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CalloutFormResponseVisibility } from '@common/enums/callout.form.response.visibility';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { LogContext } from '@common/enums/logging.context';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.entity';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
import { CalloutFormErrorCode } from './callout.form.error.codes';
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
  const authorizationService = {
    grantAccessOrFail: vi.fn(),
    isAccessGranted: vi.fn(),
  };
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
  const contributionReporter = { formResponseSubmitted: vi.fn() };
  const platformResourceAuditService = { recordEventForActor: vi.fn() };
  const logger = { error: vi.fn() };
  let resolver: CalloutFormResolverMutations;

  const actor = { actorID: 'actor-1', credentials: [] } as any;
  const callout = {
    id: 'callout-1',
    nameID: 'q4-planning-post',
    authorization: { id: 'callout-auth' },
    settings: { visibility: CalloutVisibility.PUBLISHED },
    framing: { form: { title: 'Q4 planning' } },
    calloutsSet: {
      collaboration: {
        space: { id: 'subspace-1', levelZeroSpaceID: 'l0-space' },
      },
    },
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
      contributionReporter as any,
      platformResourceAuditService as any,
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

  describe('updateCalloutForm on a template', () => {
    const formData = { formID: 'form-1', settings: {} } as any;
    const standaloneTemplate = {
      ...callout,
      isTemplate: true,
      calloutsSet: null,
    };

    it('authorizes a standalone callout template by UPDATE on the template callout, not by moderation', async () => {
      calloutFormService.getCalloutForFormOrFail.mockResolvedValue(
        standaloneTemplate
      );
      calloutFormService.updateCalloutForm.mockResolvedValue({ id: 'form-1' });

      expect(await resolver.updateCalloutForm(actor, formData)).toEqual({
        id: 'form-1',
      });
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actor,
        standaloneTemplate.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(formResponseAccess.assertCanModerate).not.toHaveBeenCalled();
    });

    it('is forbidden without UPDATE on the template and never reaches the service', async () => {
      calloutFormService.getCalloutForFormOrFail.mockResolvedValue(
        standaloneTemplate
      );
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw forbidden();
      });

      await expect(
        resolver.updateCalloutForm(actor, formData)
      ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);
      expect(calloutFormService.updateCalloutForm).not.toHaveBeenCalled();
    });

    it('keeps the callouts-set moderation path for a Form inside a template content space', async () => {
      const contentSpaceTemplate = {
        ...callout,
        isTemplate: true,
        calloutsSet: { type: 'collaboration', authorization: { id: 'cs' } },
      };
      calloutFormService.getCalloutForFormOrFail.mockResolvedValue(
        contentSpaceTemplate
      );
      calloutFormService.updateCalloutForm.mockResolvedValue({ id: 'form-1' });

      await resolver.updateCalloutForm(actor, formData);

      expect(formResponseAccess.assertCanModerate).toHaveBeenCalledWith(
        actor,
        contentSpaceTemplate
      );
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
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

    it('rejects a response to a template Form before storing anything, even when CONTRIBUTE is granted', async () => {
      // A Form inside a template content space sits in a COLLABORATION
      // callouts set and inherits the template's policy, so CONTRIBUTE can be
      // granted; it is still a definition, never a live Form.
      calloutFormService.getCalloutForFormOrFail.mockResolvedValue({
        ...callout,
        isTemplate: true,
        calloutsSet: { type: 'collaboration', collaboration: {} },
      });
      responseService.submitResponse.mockResolvedValue(stored);

      await expect(
        resolver.submitCalloutFormResponse(actor, responseData)
      ).rejects.toMatchObject({
        details: { code: CalloutFormErrorCode.FORM_TEMPLATE_NOT_RESPONDABLE },
      });
      expect(responseService.submitResponse).not.toHaveBeenCalled();
      expect(
        notificationAdapter.spaceCollaborationCalloutFormResponseSubmitted
      ).not.toHaveBeenCalled();
      expect(contributionReporter.formResponseSubmitted).not.toHaveBeenCalled();
    });

    it('rejects a response when the Post carries no template flag but its collaboration is a template (legacy or directly created rows)', async () => {
      calloutFormService.getCalloutForFormOrFail.mockResolvedValue({
        ...callout,
        isTemplate: false,
        calloutsSet: { collaboration: { isTemplate: true } },
      });
      responseService.submitResponse.mockResolvedValue(stored);

      await expect(
        resolver.submitCalloutFormResponse(actor, responseData)
      ).rejects.toMatchObject({
        details: { code: CalloutFormErrorCode.FORM_TEMPLATE_NOT_RESPONDABLE },
      });
      expect(responseService.submitResponse).not.toHaveBeenCalled();
    });

    it('still accepts a response on a live Post (neither the Post nor its collaboration is a template)', async () => {
      calloutFormService.getCalloutForFormOrFail.mockResolvedValue({
        ...callout,
        isTemplate: false,
        calloutsSet: { collaboration: { isTemplate: false, space: {} } },
      });
      responseService.submitResponse.mockResolvedValue(stored);

      await resolver.submitCalloutFormResponse(actor, responseData);
      expect(responseService.submitResponse).toHaveBeenCalled();
    });

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
      expect(contributionReporter.formResponseSubmitted).not.toHaveBeenCalled();
    });

    it('loads the Form row with the owner relations, for its title', async () => {
      responseService.submitResponse.mockResolvedValue(stored);
      await resolver.submitCalloutFormResponse(actor, responseData);
      expect(calloutFormService.getCalloutForFormOrFail).toHaveBeenCalledWith(
        'form-1',
        {
          ...CALLOUT_FORM_OWNER_RELATIONS,
          framing: { profile: true, form: true },
        }
      );
    });

    it('reports one FORM_RESPONSE_SUBMITTED per stored response: response id, Form title, level-zero space, submitter — no content', async () => {
      responseService.submitResponse.mockResolvedValue(stored);

      await resolver.submitCalloutFormResponse(actor, responseData);

      expect(contributionReporter.formResponseSubmitted).toHaveBeenCalledTimes(
        1
      );
      expect(contributionReporter.formResponseSubmitted).toHaveBeenCalledWith(
        { id: 'response-1', name: 'Q4 planning', space: 'l0-space' },
        actor
      );
      expect(
        JSON.stringify(contributionReporter.formResponseSubmitted.mock.calls)
      ).not.toContain('SECRET-ANSWER');
    });

    it("names the event after the Post's nameID when the Form has no title", async () => {
      calloutFormService.getCalloutForFormOrFail.mockResolvedValue({
        ...callout,
        framing: { form: { title: null } },
      });
      responseService.submitResponse.mockResolvedValue(stored);

      await resolver.submitCalloutFormResponse(actor, responseData);

      expect(contributionReporter.formResponseSubmitted).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'q4-planning-post' }),
        actor
      );
    });

    it('does not report when CONTRIBUTE is denied', async () => {
      authorizationService.grantAccessOrFail.mockImplementation(() => {
        throw forbidden();
      });
      await expect(
        resolver.submitCalloutFormResponse(actor, responseData)
      ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);
      expect(contributionReporter.formResponseSubmitted).not.toHaveBeenCalled();
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
      expect(
        platformResourceAuditService.recordEventForActor
      ).not.toHaveBeenCalled();
    });

    it('returns only the id, never the deleted response or its answers', async () => {
      responseService.getResponseOrFail.mockResolvedValue(response('someone'));
      responseService.deleteResponse.mockResolvedValue({
        id: 'response-1',
        answers: [{ questionID: 'q1', text: 'secret' }],
      });

      const result = await resolver.deleteCalloutFormResponse(
        actor,
        deleteData
      );

      expect(result).toEqual({ id: 'response-1' });
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

    describe('platform-role moderation audit', () => {
      const moderatedCallout = {
        ...callout,
        calloutsSet: { authorization: { id: 'set-auth' } },
      };
      const platformActor = {
        actorID: 'admin-1',
        credentials: [
          {
            type: AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
            resourceID: '',
          },
        ],
      } as any;

      beforeEach(() => {
        calloutFormService.getCalloutForFormOrFail.mockResolvedValue(
          moderatedCallout
        );
        responseService.getResponseOrFail.mockResolvedValue(
          response('respondent-1')
        );
      });

      it('audits exactly once when the moderation authority is the platform privilege, with ids only', async () => {
        authorizationService.isAccessGranted.mockReturnValue(true);

        await resolver.deleteCalloutFormResponse(platformActor, deleteData);

        expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
          platformActor,
          moderatedCallout.calloutsSet.authorization,
          AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS
        );
        expect(
          platformResourceAuditService.recordEventForActor
        ).toHaveBeenCalledTimes(1);
        expect(
          platformResourceAuditService.recordEventForActor
        ).toHaveBeenCalledWith(
          platformActor,
          [AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS],
          {
            resourceKind: 'callout-form-response',
            resourceId: 'response-1',
            calloutId: 'callout-1',
            formId: 'form-1',
            respondentUserId: 'respondent-1',
            outcome: 'deleted',
          }
        );
      });

      it('audits after the delete has applied, and omits the respondent when the account is gone', async () => {
        authorizationService.isAccessGranted.mockReturnValue(true);
        responseService.getResponseOrFail.mockResolvedValue(response(null));
        const order: string[] = [];
        responseService.deleteResponse.mockImplementation(async () => {
          order.push('delete');
        });
        platformResourceAuditService.recordEventForActor.mockImplementation(
          async (_a: unknown, _o: unknown, input: any) => {
            order.push('audit');
            expect(input.respondentUserId).toBeUndefined();
          }
        );

        await resolver.deleteCalloutFormResponse(platformActor, deleteData);

        expect(order).toEqual(['delete', 'audit']);
      });

      it('does not audit ordinary space-admin moderation', async () => {
        authorizationService.isAccessGranted.mockReturnValue(false);

        await resolver.deleteCalloutFormResponse(actor, deleteData);

        expect(responseService.deleteResponse).toHaveBeenCalledWith(
          'response-1'
        );
        expect(
          platformResourceAuditService.recordEventForActor
        ).not.toHaveBeenCalled();
      });

      it('does not audit, nor delete, when moderation is refused', async () => {
        authorizationService.isAccessGranted.mockReturnValue(true);
        formResponseAccess.assertCanModerate.mockImplementation(() => {
          throw forbidden();
        });

        await expect(
          resolver.deleteCalloutFormResponse(platformActor, deleteData)
        ).rejects.toBeInstanceOf(ForbiddenAuthorizationPolicyException);
        expect(responseService.deleteResponse).not.toHaveBeenCalled();
        expect(
          platformResourceAuditService.recordEventForActor
        ).not.toHaveBeenCalled();
      });

      describe('with the real audit writer', () => {
        const build = (save: ReturnType<typeof vi.fn>) => {
          const repository = { create: vi.fn(entry => entry), save };
          const auditLogger = { error: vi.fn() };
          const realAudit = new PlatformResourceAuditService(
            repository as any,
            auditLogger as any
          );
          const realResolver = new CalloutFormResolverMutations(
            authorizationService as any,
            formResponseAccess as any,
            calloutFormService as any,
            responseService as any,
            notificationAdapter as any,
            contributionReporter as any,
            realAudit,
            logger as any
          );
          return { repository, auditLogger, realResolver };
        };

        it('writes one platform_resource row carrying ids and no answer content', async () => {
          authorizationService.isAccessGranted.mockReturnValue(true);
          responseService.deleteResponse.mockResolvedValue({
            id: 'response-1',
            answers: [{ questionID: 'q1', text: 'secret answer' }],
          });
          const save = vi.fn().mockResolvedValue(undefined);
          const { repository, realResolver } = build(save);

          await realResolver.deleteCalloutFormResponse(
            platformActor,
            deleteData
          );

          expect(save).toHaveBeenCalledTimes(1);
          const row = repository.create.mock.calls[0][0];
          expect(row).toMatchObject({
            category: PlatformAuditCategory.PLATFORM_RESOURCE,
            outcome: PlatformAuditOutcome.RESOURCE_DELETED,
            initiatorUserId: 'admin-1',
            initiatorRole:
              PlatformAuditInitiatorRole.PLATFORM_CONTENT_FULL_ACCESS,
            details: {
              resourceKind: 'callout-form-response',
              resourceId: 'response-1',
              calloutId: 'callout-1',
              formId: 'form-1',
              respondentUserId: 'respondent-1',
            },
          });
          expect(JSON.stringify(row)).not.toContain('secret');
          expect(JSON.stringify(row)).not.toContain('answers');
        });

        it('fails open: an audit write failure neither fails nor undoes the delete', async () => {
          authorizationService.isAccessGranted.mockReturnValue(true);
          const save = vi.fn().mockRejectedValue(new Error('DB down'));
          const { auditLogger, realResolver } = build(save);

          await expect(
            realResolver.deleteCalloutFormResponse(platformActor, deleteData)
          ).resolves.toEqual({ id: 'response-1' });
          expect(responseService.deleteResponse).toHaveBeenCalledWith(
            'response-1'
          );
          expect(auditLogger.error).toHaveBeenCalled();
        });
      });

      // FR-019 (content deletions are recorded): Platform Support moderates
      // only through a Space's `allowPlatformSupportAsAdmin` grant, which
      // carries no privilege of its own — so its deletes must be recognised
      // from the policy, like Content Full Access's are.
      describe('with the real authorization service — who moderated', () => {
        const cred = (type: string, resourceID = '') => ({ type, resourceID });
        const moderation = [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ];
        // The callouts set of a Space that allows platform support as admin:
        // the space-admin rule, the consent-gated platform-support rule, and
        // the root content rule cascading Content Full Access.
        const setAuthorization = () => {
          const policy = new AuthorizationPolicy(
            AuthorizationPolicyType.CALLOUTS_SET
          );
          policy.credentialRules = [
            {
              grantedPrivileges: moderation,
              criterias: [cred(AuthorizationCredential.SPACE_ADMIN, 'space-1')],
              cascade: true,
              name: 'space-admin',
            },
            {
              grantedPrivileges: [...moderation, AuthorizationPrivilege.GRANT],
              criterias: [cred(AuthorizationCredential.PLATFORM_SUPPORT)],
              cascade: true,
              name: 'platform-support-as-admin',
            },
            {
              grantedPrivileges: [
                ...moderation,
                AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS,
              ],
              criterias: [
                cred(AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS),
              ],
              cascade: true,
              name: 'root-content',
            },
          ] as any;
          policy.privilegeRules = [] as any;
          return policy;
        };
        const moderator = (...credentials: ReturnType<typeof cred>[]) =>
          ({ actorID: 'moderator-1', credentials }) as any;

        const run = async (actorContext: any) => {
          const repository = { create: vi.fn(entry => entry), save: vi.fn() };
          const realResolver = new CalloutFormResolverMutations(
            new AuthorizationService(logger as any),
            formResponseAccess as any,
            calloutFormService as any,
            responseService as any,
            notificationAdapter as any,
            contributionReporter as any,
            new PlatformResourceAuditService(
              repository as any,
              { error: vi.fn() } as any
            ),
            logger as any
          );
          calloutFormService.getCalloutForFormOrFail.mockResolvedValue({
            ...callout,
            calloutsSet: { authorization: setAuthorization() },
          });
          await realResolver.deleteCalloutFormResponse(
            actorContext,
            deleteData
          );
          expect(responseService.deleteResponse).toHaveBeenCalledWith(
            'response-1'
          );
          return repository.create.mock.calls.map(([row]) => row);
        };

        it('audits a Platform Support delete under the space consent grant', async () => {
          const rows = await run(
            moderator(cred(AuthorizationCredential.PLATFORM_SUPPORT))
          );
          expect(rows).toHaveLength(1);
          expect(rows[0]).toMatchObject({
            category: PlatformAuditCategory.PLATFORM_RESOURCE,
            outcome: PlatformAuditOutcome.RESOURCE_DELETED,
            initiatorUserId: 'moderator-1',
            initiatorRole: PlatformAuditInitiatorRole.PLATFORM_SUPPORT,
            details: {
              resourceKind: 'callout-form-response',
              resourceId: 'response-1',
              respondentUserId: 'respondent-1',
            },
          });
        });

        it('audits a Content Full Access delete as Content Full Access', async () => {
          const rows = await run(
            moderator(
              cred(AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS)
            )
          );
          expect(rows).toHaveLength(1);
          expect(rows[0].initiatorRole).toBe(
            PlatformAuditInitiatorRole.PLATFORM_CONTENT_FULL_ACCESS
          );
        });

        it('writes one row, as Content Full Access, for a holder of both roles', async () => {
          const rows = await run(
            moderator(
              cred(AuthorizationCredential.PLATFORM_SUPPORT),
              cred(AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS)
            )
          );
          expect(rows).toHaveLength(1);
          expect(rows[0].initiatorRole).toBe(
            PlatformAuditInitiatorRole.PLATFORM_CONTENT_FULL_ACCESS
          );
        });

        it('does not audit the space’s own admin', async () => {
          const rows = await run(
            moderator(cred(AuthorizationCredential.SPACE_ADMIN, 'space-1'))
          );
          expect(rows).toHaveLength(0);
        });
      });
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
