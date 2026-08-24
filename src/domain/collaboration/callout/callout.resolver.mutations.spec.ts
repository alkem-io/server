import { SUBSCRIPTION_CALLOUT_POST_CREATED } from '@common/constants';
import { AuthorizationPrivilege } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { CalloutAllowedActors } from '@common/enums/callout.allowed.contributors';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import { ReactionType } from '@common/enums/reaction.type';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { streamToBuffer } from '@common/utils/file.util';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { CollaboraDocumentEventsService } from '@domain/collaboration/collabora-document/events/collabora.document.events.service';
import { ReactionService } from '@domain/collaboration/reaction/reaction.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { Readable } from 'stream';
import { CalloutContributionService } from '../callout-contribution/callout.contribution.service';
import { CalloutContributionAuthorizationService } from '../callout-contribution/callout.contribution.service.authorization';
import { CalloutResolverMutations } from './callout.resolver.mutations';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';

vi.mock('@common/utils/file.util', () => ({
  streamToBuffer: vi.fn().mockResolvedValue(Buffer.from('test')),
}));

describe('CalloutResolverMutations', () => {
  let resolver: CalloutResolverMutations;
  let calloutService: CalloutService;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let calloutAuthorizationService: CalloutAuthorizationService;
  let reactionService: ReactionService;
  let actorLookupService: ActorLookupService;
  let notificationAdapterSpace: NotificationSpaceAdapter;
  let _contributionAuthorizationService: CalloutContributionAuthorizationService;
  let _calloutContributionService: CalloutContributionService;
  let collaboraDocumentEventsService: CollaboraDocumentEventsService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // restoreAllMocks() above resets the factory mock for file.util, which would
    // let the real streamToBuffer run against the fake upload stream. Re-establish
    // the resolved buffer so importCollaboraDocument never touches a real stream.
    vi.mocked(streamToBuffer).mockResolvedValue(Buffer.from('test'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalloutResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: SUBSCRIPTION_CALLOUT_POST_CREATED,
          useValue: { publish: vi.fn() },
        },
        {
          provide: CollaboraDocumentEventsService,
          useValue: {
            publishOpened: vi.fn(),
            publishReplaced: vi.fn(),
            publishUploaded: vi.fn(),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CalloutResolverMutations);
    calloutService = module.get(CalloutService);
    authorizationService = module.get(AuthorizationService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    calloutAuthorizationService = module.get(CalloutAuthorizationService);
    reactionService = module.get(ReactionService);
    actorLookupService = module.get(ActorLookupService);
    notificationAdapterSpace = module.get(NotificationSpaceAdapter);
    _contributionAuthorizationService = module.get(
      CalloutContributionAuthorizationService
    );
    _calloutContributionService = module.get(CalloutContributionService);
    collaboraDocumentEventsService = module.get(CollaboraDocumentEventsService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('deleteCallout', () => {
    it('should check authorization and delete callout', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(calloutService.deleteCallout).mockResolvedValue(callout);

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.deleteCallout(actorContext, {
        ID: 'callout-1',
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        callout.authorization,
        AuthorizationPrivilege.DELETE,
        expect.any(String)
      );
      expect(calloutService.deleteCallout).toHaveBeenCalledWith('callout-1');
      expect(result).toBe(callout);
    });
  });

  describe('updateCallout', () => {
    it('should check authorization, update callout, and reset auth policy', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      const updatedCallout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(calloutService.updateCallout).mockResolvedValue(updatedCallout);

      const roomResolverService = (resolver as any).roomResolverService;
      vi.mocked(
        roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout
      ).mockResolvedValue({
        roleSet: { id: 'rs-1' },
        platformRolesAccess: { roles: [] },
      });

      vi.mocked(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([{ id: 'updated-auth' }] as any);

      const actorContext = { actorID: 'user-1' } as any;

      const _result = await resolver.updateCallout(actorContext, {
        ID: 'callout-1',
        framing: {},
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        callout.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(calloutService.updateCallout).toHaveBeenCalled();
      expect(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).toHaveBeenCalled();
      expect(authorizationPolicyService.saveAll).toHaveBeenCalled();
    });

    // The CONTRIBUTORS framing guard must hold on the UPDATE path too, not just
    // create — otherwise the admin-only / collaboration-only restriction
    // (FR-004a/FR-004f) is bypassable by converting a callout via updateCallout.
    describe('CONTRIBUTORS framing guard', () => {
      it('rejects converting a callout to CONTRIBUTORS in a non-COLLABORATION callouts set', async () => {
        const callout = {
          id: 'callout-1',
          authorization: { id: 'auth-1' },
          framing: { type: CalloutFramingType.NONE },
          calloutsSet: {
            type: CalloutsSetType.KNOWLEDGE_BASE,
            authorization: { id: 'cs-auth' },
          },
        } as any;
        vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

        const actorContext = { actorID: 'user-1' } as any;

        await expect(
          resolver.updateCallout(actorContext, {
            ID: 'callout-1',
            framing: { type: CalloutFramingType.CONTRIBUTORS },
          } as any)
        ).rejects.toThrow(ValidationException);
        expect(calloutService.updateCallout).not.toHaveBeenCalled();
      });

      it('requires the CREATE (admin) privilege to update/convert to CONTRIBUTORS even with UPDATE rights', async () => {
        const callout = {
          id: 'callout-1',
          authorization: { id: 'auth-1' },
          framing: { type: CalloutFramingType.NONE },
          calloutsSet: {
            type: CalloutsSetType.COLLABORATION,
            authorization: { id: 'cs-auth' },
          },
        } as any;
        vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

        // First call (the generic UPDATE on the callout) passes; the second call
        // (the admin CREATE on the callouts set) throws.
        vi.mocked(authorizationService.grantAccessOrFail)
          .mockImplementationOnce(() => undefined as any)
          .mockImplementationOnce(() => {
            throw new ValidationException('forbidden', 'collaboration' as any);
          });

        const actorContext = { actorID: 'member-1' } as any;

        await expect(
          resolver.updateCallout(actorContext, {
            ID: 'callout-1',
            framing: { type: CalloutFramingType.CONTRIBUTORS },
          } as any)
        ).rejects.toThrow();

        expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
          actorContext,
          callout.calloutsSet.authorization,
          AuthorizationPrivilege.CREATE,
          expect.any(String)
        );
        expect(calloutService.updateCallout).not.toHaveBeenCalled();
      });
    });

    // A CONTRIBUTORS callout TEMPLATE has no calloutsSet, so it must be EXEMPT
    // from the collaboration-only / admin-CREATE guard — its settings can be
    // edited and the framing removed (→ NONE), but it must not be switched to
    // another framing type.
    describe('CONTRIBUTORS framing on templates', () => {
      const setupUpdateSuccess = (callout: any) => {
        vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
        vi.mocked(calloutService.updateCallout).mockResolvedValue(callout);
        const roomResolverService = (resolver as any).roomResolverService;
        vi.mocked(
          roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout
        ).mockResolvedValue({
          roleSet: { id: 'rs-1' },
          platformRolesAccess: { roles: [] },
        });
        vi.mocked(
          calloutAuthorizationService.applyAuthorizationPolicy
        ).mockResolvedValue([{ id: 'updated-auth' }] as any);
      };

      it('allows editing a CONTRIBUTORS callout template (no calloutsSet) — no collaboration/admin guard', async () => {
        const callout = {
          id: 'tmpl-1',
          isTemplate: true,
          authorization: { id: 'auth-1' },
          framing: { type: CalloutFramingType.CONTRIBUTORS },
          // standalone callout template → no calloutsSet
        } as any;
        setupUpdateSuccess(callout);

        await resolver.updateCallout(
          { actorID: 'u1' } as any,
          {
            ID: 'tmpl-1',
            settings: {
              framing: { contributors: { contributorTypes: ['organization'] } },
            },
          } as any
        );

        expect(calloutService.updateCallout).toHaveBeenCalled();
      });

      it('allows removing the framing on a template (CONTRIBUTORS → NONE)', async () => {
        const callout = {
          id: 'tmpl-1',
          isTemplate: true,
          authorization: { id: 'auth-1' },
          framing: { type: CalloutFramingType.CONTRIBUTORS },
        } as any;
        setupUpdateSuccess(callout);

        await resolver.updateCallout(
          { actorID: 'u1' } as any,
          {
            ID: 'tmpl-1',
            framing: { type: CalloutFramingType.NONE },
          } as any
        );

        expect(calloutService.updateCallout).toHaveBeenCalled();
      });

      it('rejects switching a CONTRIBUTORS template framing to another type', async () => {
        const callout = {
          id: 'tmpl-1',
          isTemplate: true,
          authorization: { id: 'auth-1' },
          framing: { type: CalloutFramingType.CONTRIBUTORS },
        } as any;
        vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

        await expect(
          resolver.updateCallout(
            { actorID: 'u1' } as any,
            {
              ID: 'tmpl-1',
              framing: { type: CalloutFramingType.WHITEBOARD },
            } as any
          )
        ).rejects.toThrow(ValidationException);
        expect(calloutService.updateCallout).not.toHaveBeenCalled();
      });
    });
  });

  describe('updateCalloutVisibility', () => {
    it('should update visibility and reset auth policy', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        isTemplate: false,
        settings: { visibility: CalloutVisibility.DRAFT },
        framing: {},
        calloutsSet: {
          type: CalloutsSetType.COLLABORATION,
          authorization: { id: 'cs-auth' },
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(calloutService.updateCalloutVisibility).mockResolvedValue({
        ...callout,
        isTemplate: false,
        settings: { visibility: CalloutVisibility.PUBLISHED },
      } as any);
      vi.mocked(calloutService.updateCalloutPublishInfo).mockResolvedValue(
        callout
      );

      const roomResolverService = (resolver as any).roomResolverService;
      vi.mocked(
        roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout
      ).mockResolvedValue({
        roleSet: { id: 'rs-1' },
        platformRolesAccess: { roles: [] },
      });

      vi.mocked(
        calloutAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);

      const actorContext = { actorID: 'user-1' } as any;

      await resolver.updateCalloutVisibility(actorContext, {
        calloutID: 'callout-1',
        visibility: CalloutVisibility.PUBLISHED,
        sendNotification: false,
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(calloutService.updateCalloutVisibility).toHaveBeenCalled();
    });
  });

  describe('updateCalloutPublishInfo', () => {
    it('should check authorization and update publish info', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(calloutService.updateCalloutPublishInfo).mockResolvedValue(
        callout
      );

      const actorContext = { actorID: 'user-1' } as any;

      await resolver.updateCalloutPublishInfo(actorContext, {
        calloutID: 'callout-1',
        publisherID: 'pub-1',
        publishDate: Date.now(),
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        callout.authorization,
        AuthorizationPrivilege.UPDATE_CALLOUT_PUBLISHER,
        expect.any(String)
      );
    });
  });

  describe('createContributionOnCallout', () => {
    it('should throw RelationshipNotFoundException when callout has no calloutsSet', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        calloutsSet: undefined,
        settings: {
          contribution: { enabled: true, canAddContributions: 'ALL' },
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.createContributionOnCallout(actorContext, {
          calloutID: 'callout-1',
        } as any)
      ).rejects.toThrow(RelationshipNotFoundException);
    });

    it('should throw CalloutClosedException when contributions are disabled', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        calloutsSet: { id: 'cs-1', type: CalloutsSetType.COLLABORATION },
        settings: {
          contribution: {
            enabled: false,
            canAddContributions: CalloutAllowedActors.MEMBERS,
          },
          visibility: CalloutVisibility.PUBLISHED,
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.createContributionOnCallout(actorContext, {
          calloutID: 'callout-1',
        } as any)
      ).rejects.toThrow(CalloutClosedException);
    });

    it('should throw CalloutClosedException when canAddContributions is NONE', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        calloutsSet: { id: 'cs-1', type: CalloutsSetType.COLLABORATION },
        settings: {
          contribution: {
            enabled: true,
            canAddContributions: CalloutAllowedActors.NONE,
          },
          visibility: CalloutVisibility.PUBLISHED,
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.createContributionOnCallout(actorContext, {
          calloutID: 'callout-1',
        } as any)
      ).rejects.toThrow(CalloutClosedException);
    });

    it('should throw CalloutClosedException when admins-only and user lacks UPDATE', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        calloutsSet: { id: 'cs-1', type: CalloutsSetType.COLLABORATION },
        settings: {
          contribution: {
            enabled: true,
            canAddContributions: CalloutAllowedActors.ADMINS,
          },
          visibility: CalloutVisibility.PUBLISHED,
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);

      const actorContext = { actorID: 'user-1' } as any;

      await expect(
        resolver.createContributionOnCallout(actorContext, {
          calloutID: 'callout-1',
        } as any)
      ).rejects.toThrow(CalloutClosedException);
    });

    const setupCollaboraCreateHappyPath = (visibility: CalloutVisibility) => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        calloutsSet: { id: 'cs-1', type: CalloutsSetType.COLLABORATION },
        settings: {
          contribution: {
            enabled: true,
            canAddContributions: CalloutAllowedActors.MEMBERS,
          },
          visibility,
        },
      } as any;
      const contribution = {
        id: 'contrib-1',
        collaboraDocument: {
          id: 'collab-doc-1',
          profile: { displayName: 'My Spreadsheet' },
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(calloutService.createContributionOnCallout).mockResolvedValue(
        contribution
      );

      const roomResolverService = (resolver as any).roomResolverService;
      vi.mocked(
        roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout
      ).mockResolvedValue({
        roleSet: { id: 'rs-1' },
        platformRolesAccess: { roles: [] },
        spaceSettings: {},
      });

      vi.mocked(_calloutContributionService.save).mockResolvedValue(
        contribution
      );
      vi.mocked(
        _calloutContributionService.materializeCalloutContributionContent
      ).mockResolvedValue(undefined as any);
      vi.mocked(
        _calloutContributionService.getStorageBucketForContribution
      ).mockResolvedValue({ id: 'bucket-1' } as any);
      vi.mocked(
        _contributionAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(
        _calloutContributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);

      const communityResolverService = (resolver as any)
        .communityResolverService;
      vi.mocked(
        communityResolverService.getLevelZeroSpaceIdForCalloutsSet
      ).mockResolvedValue('space-root');

      return { callout, contribution };
    };

    it('should report COLLABORA_DOCUMENT_CREATED when the callout is PUBLISHED', async () => {
      setupCollaboraCreateHappyPath(CalloutVisibility.PUBLISHED);
      const contributionReporter = (resolver as any).contributionReporter;
      const actorContext = { actorID: 'user-1' } as any;

      await resolver.createContributionOnCallout(actorContext, {
        calloutID: 'callout-1',
        type: 'collabora_document',
        collaboraDocument: {},
      } as any);

      expect(
        contributionReporter.calloutCollaboraDocumentCreated
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'collab-doc-1',
          name: 'My Spreadsheet',
          space: 'space-root',
        }),
        actorContext
      );
    });

    it('should NOT report COLLABORA_DOCUMENT_CREATED when the callout is DRAFT', async () => {
      setupCollaboraCreateHappyPath(CalloutVisibility.DRAFT);
      const contributionReporter = (resolver as any).contributionReporter;
      const actorContext = { actorID: 'user-1' } as any;

      await resolver.createContributionOnCallout(actorContext, {
        calloutID: 'callout-1',
        type: 'collabora_document',
        collaboraDocument: {},
      } as any);

      expect(
        contributionReporter.calloutCollaboraDocumentCreated
      ).not.toHaveBeenCalled();
    });
  });

  describe('importCollaboraDocument', () => {
    const setupImportHappyPath = () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        settings: {
          contribution: {
            enabled: true,
            canAddContributions: CalloutAllowedActors.MEMBERS,
          },
        },
      } as any;
      const contribution = {
        id: 'contrib-1',
        collaboraDocument: {
          id: 'collab-doc-1',
          profile: { displayName: 'Imported.docx' },
        },
      } as any;

      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);
      vi.mocked(
        calloutService.importCollaboraDocumentToCallout
      ).mockResolvedValue(contribution);

      const configService = (resolver as any).configService;
      vi.mocked(configService.get).mockReturnValue(1000);

      const roomResolverService = (resolver as any).roomResolverService;
      vi.mocked(
        roomResolverService.getRoleSetAndPlatformRolesWithAccessForCallout
      ).mockResolvedValue({
        roleSet: { id: 'rs-1' },
        platformRolesAccess: { roles: [] },
        spaceSettings: {},
      });

      vi.mocked(_calloutContributionService.save).mockResolvedValue(
        contribution
      );
      vi.mocked(
        _contributionAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        [] as any
      );
      vi.mocked(
        _calloutContributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);
      return { callout, contribution };
    };

    const invokeImport = (actorContext = { actorID: 'user-1' } as any) =>
      resolver.importCollaboraDocument(
        actorContext,
        { calloutID: 'callout-1' } as any,
        {
          createReadStream: () => Readable.from([Buffer.from('test')]),
          filename: 'Imported.docx',
          mimetype: 'application/octet-stream',
        } as any
      );

    it('publishes one uploaded event after all persistence completes', async () => {
      setupImportHappyPath();
      const actorContext = { actorID: 'user-1' } as any;

      await invokeImport(actorContext);

      expect(
        collaboraDocumentEventsService.publishUploaded
      ).toHaveBeenCalledOnce();
      expect(
        collaboraDocumentEventsService.publishUploaded
      ).toHaveBeenCalledWith('collab-doc-1', 'Imported.docx', actorContext);
      expect(
        vi.mocked(calloutService.importCollaboraDocumentToCallout).mock
          .invocationCallOrder[0]
      ).toBeLessThan(
        vi.mocked(_calloutContributionService.save).mock.invocationCallOrder[0]
      );
      expect(
        vi.mocked(_calloutContributionService.save).mock.invocationCallOrder[0]
      ).toBeLessThan(
        vi.mocked(_contributionAuthorizationService.applyAuthorizationPolicy)
          .mock.invocationCallOrder[0]
      );
      expect(
        vi.mocked(_contributionAuthorizationService.applyAuthorizationPolicy)
          .mock.invocationCallOrder[0]
      ).toBeLessThan(
        vi.mocked(authorizationPolicyService.saveAll).mock
          .invocationCallOrder[0]
      );
      expect(
        vi.mocked(authorizationPolicyService.saveAll).mock
          .invocationCallOrder[0]
      ).toBeLessThan(
        vi.mocked(collaboraDocumentEventsService.publishUploaded).mock
          .invocationCallOrder[0]
      );
    });

    it('does not publish when authorization fails', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        settings: {
          contribution: {
            enabled: true,
            canAddContributions: CalloutAllowedActors.MEMBERS,
          },
        },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(
        () => {
          throw new Error('authorization denied');
        }
      );

      await expect(invokeImport()).rejects.toThrow('authorization denied');

      expect(
        collaboraDocumentEventsService.publishUploaded
      ).not.toHaveBeenCalled();
    });

    it.each([
      {
        failure: 'import',
        reject: () =>
          vi
            .mocked(calloutService.importCollaboraDocumentToCallout)
            .mockRejectedValue(new Error('import failed')),
      },
      {
        failure: 'contribution save',
        reject: () =>
          vi
            .mocked(_calloutContributionService.save)
            .mockRejectedValue(new Error('contribution save failed')),
      },
      {
        failure: 'authorization policy save',
        reject: () =>
          vi
            .mocked(authorizationPolicyService.saveAll)
            .mockRejectedValue(new Error('authorization policy save failed')),
      },
    ])('does not publish when $failure fails', async ({ reject }) => {
      setupImportHappyPath();
      reject();

      await expect(invokeImport()).rejects.toThrow();

      expect(
        collaboraDocumentEventsService.publishUploaded
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateContributionsSortOrder', () => {
    it('should check authorization and delegate to service', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(
        calloutService.updateContributionCalloutsSortOrder
      ).mockResolvedValue([{ id: 'c-1' }] as any);

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.updateContributionsSortOrder(actorContext, {
        calloutID: 'callout-1',
        contributionIDs: ['c-1'],
      } as any);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        callout.authorization,
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('addReactionToCallout', () => {
    function makePublishedCallout(overrides: Record<string, unknown> = {}) {
      return {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
        isTemplate: false,
        settings: { visibility: CalloutVisibility.PUBLISHED },
        ...overrides,
      } as any;
    }

    it('requires CONTRIBUTE — throws when authorization service denies access', async () => {
      const callout = makePublishedCallout();
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(
        () => {
          throw new ValidationException('forbidden', 'test' as any);
        }
      );

      await expect(
        resolver.addReactionToCallout(
          { actorID: 'user-1' } as any,
          { calloutID: 'callout-1', emoji: 'heart' } as any
        )
      ).rejects.toThrow(ValidationException);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        expect.objectContaining({ actorID: 'user-1' }),
        callout.authorization,
        AuthorizationPrivilege.CONTRIBUTE,
        expect.any(String)
      );
    });

    it('rejects when the actor has no userID (VC or anonymous)', async () => {
      const callout = makePublishedCallout();
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      await expect(
        resolver.addReactionToCallout(
          { actorID: undefined } as any,
          { calloutID: 'callout-1', emoji: 'heart' } as any
        )
      ).rejects.toThrow(ValidationException);

      expect(reactionService.upsertReaction).not.toHaveBeenCalled();
    });

    it('rejects when the Callout is a DRAFT (not published)', async () => {
      const callout = makePublishedCallout({
        settings: { visibility: CalloutVisibility.DRAFT },
      });
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      await expect(
        resolver.addReactionToCallout(
          { actorID: 'user-1' } as any,
          { calloutID: 'callout-1', emoji: 'heart' } as any
        )
      ).rejects.toThrow(ValidationException);

      expect(reactionService.upsertReaction).not.toHaveBeenCalled();
    });

    it('rejects when the Callout is a template', async () => {
      const callout = makePublishedCallout({ isTemplate: true });
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);

      await expect(
        resolver.addReactionToCallout(
          { actorID: 'user-1' } as any,
          { calloutID: 'callout-1', emoji: 'heart' } as any
        )
      ).rejects.toThrow(ValidationException);

      expect(reactionService.upsertReaction).not.toHaveBeenCalled();
    });

    it.each([
      '1',
      '#',
      '*',
    ])('rejects the emoji slug "%s" that is not on the allow-list', async (badSlug: string) => {
      const callout = makePublishedCallout();
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      // Simulate the allow-list rejection that reactionService.validateAllowedEmojiOrFail
      // raises when the emoji slug is not present.
      vi.mocked(reactionService.validateAllowedEmojiOrFail).mockImplementation(
        () => {
          throw new ValidationException(
            'emoji not on allow-list',
            'test' as any
          );
        }
      );

      await expect(
        resolver.addReactionToCallout(
          { actorID: 'user-1' } as any,
          { calloutID: 'callout-1', emoji: badSlug } as any
        )
      ).rejects.toThrow(ValidationException);

      expect(reactionService.upsertReaction).not.toHaveBeenCalled();
    });

    it('rejects when the actor is a Virtual Contributor (non-user actor type)', async () => {
      const callout = makePublishedCallout();
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.VIRTUAL_CONTRIBUTOR
      );

      await expect(
        resolver.addReactionToCallout(
          { actorID: 'vc-1' } as any,
          { calloutID: 'callout-1', emoji: 'heart' } as any
        )
      ).rejects.toThrow(ValidationException);

      expect(reactionService.upsertReaction).not.toHaveBeenCalled();
    });

    it('delegates to upsertReaction and returns the refreshed Callout on success', async () => {
      const callout = makePublishedCallout();
      const refreshedCallout = { ...callout, id: 'callout-1' } as any;
      vi.mocked(calloutService.getCalloutOrFail)
        .mockResolvedValueOnce(callout)
        .mockResolvedValueOnce(refreshedCallout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.USER
      );
      vi.mocked(reactionService.upsertReaction).mockResolvedValue({
        reaction: {},
        created: false,
      } as any);

      const result = await resolver.addReactionToCallout(
        { actorID: 'user-1' } as any,
        { calloutID: 'callout-1', emoji: 'heart' } as any
      );

      expect(reactionService.upsertReaction).toHaveBeenCalledWith(
        ReactionType.POST,
        'callout-1',
        'user-1',
        'heart'
      );
      expect(result).toBe(refreshedCallout);
    });

    it('emits exactly one notification dispatch when the reaction is genuine (created:true)', async () => {
      const callout = makePublishedCallout();
      const refreshedCallout = { ...callout } as any;
      vi.mocked(calloutService.getCalloutOrFail)
        .mockResolvedValueOnce(callout)
        .mockResolvedValueOnce(refreshedCallout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.USER
      );
      vi.mocked(reactionService.upsertReaction).mockResolvedValue({
        reaction: {},
        created: true,
      } as any);
      vi.mocked(
        notificationAdapterSpace.spaceCollaborationCalloutReaction
      ).mockResolvedValue(undefined);

      await resolver.addReactionToCallout(
        { actorID: 'user-1' } as any,
        { calloutID: 'callout-1', emoji: 'heart' } as any
      );

      // Fire-and-forget is async; flush the microtask queue so the promise
      // callback runs before we assert.
      await Promise.resolve();

      expect(
        notificationAdapterSpace.spaceCollaborationCalloutReaction
      ).toHaveBeenCalledExactlyOnceWith({
        calloutID: 'callout-1',
        triggeredBy: 'user-1',
        emoji: 'heart',
      });
    });

    it('emits zero notification dispatches when the reaction is a swap (created:false)', async () => {
      const callout = makePublishedCallout();
      const refreshedCallout = { ...callout } as any;
      vi.mocked(calloutService.getCalloutOrFail)
        .mockResolvedValueOnce(callout)
        .mockResolvedValueOnce(refreshedCallout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.USER
      );
      // Swap: same user re-reacts with a different emoji — service returns created:false.
      vi.mocked(reactionService.upsertReaction).mockResolvedValue({
        reaction: {},
        created: false,
      } as any);

      await resolver.addReactionToCallout(
        { actorID: 'user-1' } as any,
        { calloutID: 'callout-1', emoji: 'thumbsup' } as any
      );

      await Promise.resolve();

      expect(
        notificationAdapterSpace.spaceCollaborationCalloutReaction
      ).not.toHaveBeenCalled();
    });

    it('emits zero notification dispatches when an idempotent re-add is detected (created:false)', async () => {
      const callout = makePublishedCallout();
      const refreshedCallout = { ...callout } as any;
      vi.mocked(calloutService.getCalloutOrFail)
        .mockResolvedValueOnce(callout)
        .mockResolvedValueOnce(refreshedCallout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.USER
      );
      // Idempotent re-add: the ON CONFLICT upsert found an existing row, created:false.
      vi.mocked(reactionService.upsertReaction).mockResolvedValue({
        reaction: {},
        created: false,
      } as any);

      await resolver.addReactionToCallout(
        { actorID: 'user-1' } as any,
        { calloutID: 'callout-1', emoji: 'heart' } as any
      );

      await Promise.resolve();

      expect(
        notificationAdapterSpace.spaceCollaborationCalloutReaction
      ).not.toHaveBeenCalled();
    });

    it('does not fail the mutation when the notification adapter rejects (fire-and-forget)', async () => {
      const callout = makePublishedCallout();
      const refreshedCallout = { ...callout } as any;
      vi.mocked(calloutService.getCalloutOrFail)
        .mockResolvedValueOnce(callout)
        .mockResolvedValueOnce(refreshedCallout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.USER
      );
      vi.mocked(reactionService.upsertReaction).mockResolvedValue({
        reaction: {},
        created: true,
      } as any);
      vi.mocked(
        notificationAdapterSpace.spaceCollaborationCalloutReaction
      ).mockRejectedValue(new Error('adapter failure'));

      // The mutation must resolve, not reject, even though the adapter rejects.
      await expect(
        resolver.addReactionToCallout(
          { actorID: 'user-1' } as any,
          { calloutID: 'callout-1', emoji: 'heart' } as any
        )
      ).resolves.toBeDefined();

      // Allow the fire-and-forget rejection handler to run.
      await Promise.resolve();
    });
  });

  describe('removeReactionFromCallout — notification invariant', () => {
    it('never dispatches a notification on remove', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.USER
      );
      vi.mocked(reactionService.removeReaction).mockResolvedValue(undefined);

      await resolver.removeReactionFromCallout(
        { actorID: 'user-1' } as any,
        { calloutID: 'callout-1' } as any
      );

      await Promise.resolve();

      expect(
        notificationAdapterSpace.spaceCollaborationCalloutReaction
      ).not.toHaveBeenCalled();
    });
  });

  describe('removeReactionFromCallout', () => {
    it('rejects when the actor has no userID (unauthenticated)', async () => {
      await expect(
        resolver.removeReactionFromCallout(
          { actorID: undefined } as any,
          { calloutID: 'callout-1' } as any
        )
      ).rejects.toThrow(ValidationException);

      expect(reactionService.removeReaction).not.toHaveBeenCalled();
    });

    it('rejects when the actor is a Virtual Contributor (non-user actor type)', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.VIRTUAL_CONTRIBUTOR
      );

      await expect(
        resolver.removeReactionFromCallout(
          { actorID: 'vc-1' } as any,
          { calloutID: 'callout-1' } as any
        )
      ).rejects.toThrow(ValidationException);

      expect(reactionService.removeReaction).not.toHaveBeenCalled();
    });

    it('delegates to removeReaction (idempotent) and returns the Callout when the caller has READ', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.USER
      );
      vi.mocked(reactionService.removeReaction).mockResolvedValue(undefined);

      const result = await resolver.removeReactionFromCallout(
        { actorID: 'user-1' } as any,
        { calloutID: 'callout-1' } as any
      );

      expect(reactionService.removeReaction).toHaveBeenCalled();
      expect(result).toBe(callout);
    });

    it('requires READ on the Callout before disclosing metadata — throws when READ is denied', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.USER
      );
      vi.mocked(reactionService.removeReaction).mockResolvedValue(undefined);
      vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(
        () => {
          throw new ValidationException('forbidden', 'test' as any);
        }
      );

      await expect(
        resolver.removeReactionFromCallout(
          { actorID: 'user-1' } as any,
          { calloutID: 'callout-1' } as any
        )
      ).rejects.toThrow(ValidationException);

      // The reaction is still removed (idempotent self-cleanup) even when READ is lost.
      expect(reactionService.removeReaction).toHaveBeenCalled();
    });

    it('does NOT require CONTRIBUTE — only READ is checked on the remove path', async () => {
      const callout = {
        id: 'callout-1',
        authorization: { id: 'auth-1' },
      } as any;
      vi.mocked(calloutService.getCalloutOrFail).mockResolvedValue(callout);
      vi.mocked(actorLookupService.getActorTypeByIdOrFail).mockResolvedValue(
        ActorType.USER
      );
      vi.mocked(reactionService.removeReaction).mockResolvedValue(undefined);

      await resolver.removeReactionFromCallout(
        { actorID: 'user-1' } as any,
        { calloutID: 'callout-1' } as any
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        expect.objectContaining({ actorID: 'user-1' }),
        callout.authorization,
        AuthorizationPrivilege.READ,
        expect.any(String)
      );
      // CONTRIBUTE must not be checked on the remove path.
      expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        AuthorizationPrivilege.CONTRIBUTE,
        expect.any(String)
      );
    });
  });
});
