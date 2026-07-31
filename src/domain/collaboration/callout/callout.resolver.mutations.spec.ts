import { SUBSCRIPTION_CALLOUT_POST_CREATED } from '@common/constants';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CalloutAllowedActors } from '@common/enums/callout.allowed.contributors';
import { CalloutFramingType } from '@common/enums/callout.framing.type';
import { CalloutVisibility } from '@common/enums/callout.visibility';
import { CalloutsSetType } from '@common/enums/callouts.set.type';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { CalloutClosedException } from '@common/exceptions/callout/callout.closed.exception';
import { streamToBuffer } from '@common/utils/file.util';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PlatformResourceAuditService } from '@src/platform-admin/platform-resource-audit/platform.resource.audit.service';
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
  let module: TestingModule;
  let resolver: CalloutResolverMutations;
  let calloutService: CalloutService;
  let authorizationService: AuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let calloutAuthorizationService: CalloutAuthorizationService;
  let _contributionAuthorizationService: CalloutContributionAuthorizationService;
  let _calloutContributionService: CalloutContributionService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    // restoreAllMocks() above resets the factory mock for file.util, which would
    // let the real streamToBuffer run against the fake upload stream. Re-establish
    // the resolved buffer so importCollaboraDocument never touches a real stream.
    vi.mocked(streamToBuffer).mockResolvedValue(Buffer.from('test'));

    module = await Test.createTestingModule({
      providers: [
        CalloutResolverMutations,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: SUBSCRIPTION_CALLOUT_POST_CREATED,
          useValue: { publish: vi.fn() },
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
    _contributionAuthorizationService = module.get(
      CalloutContributionAuthorizationService
    );
    _calloutContributionService = module.get(CalloutContributionService);
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
      // 027-platform-role-redesign (T043): the dual-path check calls
      // isAccessGranted before falling through to grantAccessOrFail.
      vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);

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
    it('should report COLLABORA_DOCUMENT_UPLOADED for the uploading actor', async () => {
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
      vi.mocked(
        _calloutContributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);

      const communityResolverService = (resolver as any)
        .communityResolverService;
      vi.mocked(
        communityResolverService.getCommunityForCollaboraDocumentOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getLevelZeroSpaceIdForCommunity
      ).mockResolvedValue('space-root');

      const contributionReporter = (resolver as any).contributionReporter;
      const actorContext = { actorID: 'user-1' } as any;

      await resolver.importCollaboraDocument(
        actorContext,
        { calloutID: 'callout-1' } as any,
        {
          createReadStream: () => Readable.from([Buffer.from('test')]),
          filename: 'Imported.docx',
          mimetype: 'application/octet-stream',
        } as any
      );

      expect(
        contributionReporter.calloutCollaboraDocumentUploaded
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'collab-doc-1',
          name: 'Imported.docx',
          space: 'space-root',
        }),
        actorContext
      );
    });

    it('should still return the persisted contribution when analytics reporting fails', async () => {
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
      vi.mocked(
        _calloutContributionService.getCalloutContributionOrFail
      ).mockResolvedValue(contribution);

      // analytics resolution blows up after the contribution is persisted
      const communityResolverService = (resolver as any)
        .communityResolverService;
      vi.mocked(
        communityResolverService.getCommunityForCollaboraDocumentOrFail
      ).mockRejectedValue(new Error('community resolution failed'));

      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.importCollaboraDocument(
        actorContext,
        { calloutID: 'callout-1' } as any,
        {
          createReadStream: () => Readable.from([Buffer.from('test')]),
          filename: 'Imported.docx',
          mimetype: 'application/octet-stream',
        } as any
      );

      // the persisted contribution is returned; analytics failure is swallowed
      expect(result).toBe(contribution);
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
  // ===================================================================
  // qual-server-12 + qual-server-13 (2026-07-31) — two `recordEventForActor`
  // sites here, neither asserted. `deleteCallout` is an A8 DUAL-PATH surface
  // whose existing suite stubs `isAccessGranted` to `false`, so the PLATFORM
  // branch (and its FR-018a audit write) never executed;
  // `updateCalloutPublishInfo` is SINGLE-path, so it must always record.
  // ===================================================================
  describe('A8 audit coverage (qual-server-12/13)', () => {
    const actorContext = { actorID: 'actor-1' } as any;
    const callout = { id: 'callout-1', authorization: { id: 'auth-1' } } as any;

    const grantOnly = (privilege: AuthorizationPrivilege) =>
      (authorizationService as any).isAccessGranted.mockImplementation(
        (_a: any, _p: any, requested: any) => requested === privilege
      );

    const resourceAudit = () => module.get(PlatformResourceAuditService) as any;

    beforeEach(() => {
      (calloutService as any).getCalloutOrFail.mockResolvedValue(callout);
      (calloutService as any).deleteCallout.mockResolvedValue(callout);
      (calloutService as any).updateCalloutPublishInfo.mockResolvedValue(
        callout
      );
      (authorizationService as any).grantAccessOrFail.mockReturnValue(
        undefined
      );
    });

    it('deleteCallout records a `deleted` event on the PLATFORM branch', async () => {
      grantOnly(AuthorizationPrivilege.PLATFORM_CONTENT_FULL_ACCESS);

      await resolver.deleteCallout(actorContext, { ID: 'callout-1' } as any);

      expect(resourceAudit().recordEventForActor).toHaveBeenCalledWith(
        actorContext,
        expect.arrayContaining([
          AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
        ]),
        expect.any(Array),
        expect.objectContaining({
          resourceKind: 'callout',
          resourceId: 'callout-1',
          outcome: 'deleted',
        })
      );
    });

    it('deleteCallout records NOTHING on the OWNER branch', async () => {
      grantOnly(AuthorizationPrivilege.DELETE);

      await resolver.deleteCallout(actorContext, { ID: 'callout-1' } as any);

      expect(resourceAudit().recordEventForActor).not.toHaveBeenCalled();
    });

    it('updateCalloutPublishInfo always records — it is single-path', async () => {
      await resolver.updateCalloutPublishInfo(actorContext, {
        calloutID: 'callout-1',
        publisherID: 'user-1',
      } as any);

      expect(resourceAudit().recordEventForActor).toHaveBeenCalledWith(
        actorContext,
        expect.any(Array),
        expect.any(Array),
        expect.objectContaining({
          resourceKind: 'callout-publisher',
          resourceId: 'callout-1',
          outcome: 'visibility_changed',
        })
      );
    });
  });
});
