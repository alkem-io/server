import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ContributionReporterService } from '@services/external/elasticsearch/contribution-reporter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CollaboraDocumentResolverMutations } from './collabora.document.resolver.mutations';
import { CollaboraDocumentService } from './collabora.document.service';
import { CollaboraDocumentAuthorizationService } from './collabora.document.service.authorization';

vi.mock('@common/utils/file.util', () => ({
  streamToBuffer: vi.fn().mockResolvedValue(Buffer.from('new-bytes')),
}));

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('CollaboraDocumentResolverMutations', () => {
  let resolver: CollaboraDocumentResolverMutations;
  let authorizationService: AuthorizationService;
  let collaboraDocumentService: CollaboraDocumentService;
  let collaboraDocumentAuthorizationService: CollaboraDocumentAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let contributionReporter: ContributionReporterService;
  let communityResolverService: CommunityResolverService;

  const fileUpload = () =>
    ({
      createReadStream: vi.fn(),
      filename: 'report.xlsx',
      mimetype: XLSX_MIME,
    }) as any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CollaboraDocumentResolverMutations, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CollaboraDocumentResolverMutations);
    authorizationService = module.get(AuthorizationService);
    collaboraDocumentService = module.get(CollaboraDocumentService);
    collaboraDocumentAuthorizationService = module.get(
      CollaboraDocumentAuthorizationService
    );
    authorizationPolicyService = module.get(AuthorizationPolicyService);
    contributionReporter = module.get(ContributionReporterService);
    communityResolverService = module.get(CommunityResolverService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('replaceCollaboraDocument', () => {
    const wireHappyPath = () => {
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue({
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
      } as any);
      vi.mocked(
        collaboraDocumentService.replaceCollaboraDocument
      ).mockResolvedValue({
        id: 'collab-doc-1',
        profile: { displayName: 'Quarterly Report' },
      } as any);
      vi.mocked(
        communityResolverService.getCommunityForCollaboraDocumentOrFail
      ).mockResolvedValue({ id: 'community-1' } as any);
      vi.mocked(
        communityResolverService.getLevelZeroSpaceIdForCommunity
      ).mockResolvedValue('space-root');
      vi.mocked(
        collaboraDocumentAuthorizationService.applyBackingDocumentAuthorization
      ).mockResolvedValue([{ id: 'doc-auth-1' }] as any);
    };

    it('enforces UPDATE, does not forward displayName, and reports COLLABORA_DOCUMENT_REPLACED on success', async () => {
      wireHappyPath();
      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.replaceCollaboraDocument(
        actorContext,
        { ID: 'collab-doc-1', displayName: 'A New Title' },
        fileUpload()
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        expect.objectContaining({ id: 'auth-1' }),
        AuthorizationPrivilege.UPDATE,
        expect.any(String)
      );

      // The swap minted a new backing Document, so its authorization must be
      // re-cascaded and persisted (otherwise opening the editor 403s at /wopi/token).
      expect(
        collaboraDocumentAuthorizationService.applyBackingDocumentAuthorization
      ).toHaveBeenCalledWith('collab-doc-1');
      expect(authorizationPolicyService.saveAll).toHaveBeenCalledWith([
        { id: 'doc-auth-1' },
      ]);

      // displayName is accepted but NOT applied (FR-009/FR-015): it must never
      // reach the service. The service is called with id/buffer/filename/mime/
      // actorID only.
      expect(
        collaboraDocumentService.replaceCollaboraDocument
      ).toHaveBeenCalledWith(
        'collab-doc-1',
        expect.any(Buffer),
        'report.xlsx',
        XLSX_MIME,
        'user-1'
      );

      expect(
        contributionReporter.calloutCollaboraDocumentReplaced
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'collab-doc-1',
          name: 'Quarterly Report',
          space: 'space-root',
        }),
        actorContext
      );

      expect(result.id).toBe('collab-doc-1');
    });

    it('refuses when the caller lacks UPDATE and never touches the document', async () => {
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue({
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
      } as any);
      vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(
        () => {
          throw new Error('Authorization denied');
        }
      );

      await expect(
        resolver.replaceCollaboraDocument(
          { actorID: 'user-1' } as any,
          { ID: 'collab-doc-1' },
          fileUpload()
        )
      ).rejects.toThrow('Authorization denied');

      expect(
        collaboraDocumentService.replaceCollaboraDocument
      ).not.toHaveBeenCalled();
    });

    it('still returns the swapped document when analytics reporting fails (best-effort, FR-014)', async () => {
      wireHappyPath();
      vi.mocked(
        communityResolverService.getCommunityForCollaboraDocumentOrFail
      ).mockRejectedValue(new Error('community lookup down'));

      const result = await resolver.replaceCollaboraDocument(
        { actorID: 'user-1' } as any,
        { ID: 'collab-doc-1' },
        fileUpload()
      );

      expect(result.id).toBe('collab-doc-1');
      expect(
        contributionReporter.calloutCollaboraDocumentReplaced
      ).not.toHaveBeenCalled();
    });
  });
});
