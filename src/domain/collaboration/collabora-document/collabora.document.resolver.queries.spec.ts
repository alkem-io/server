import { AuthorizationService } from '@core/authorization/authorization.service';
import { Test, TestingModule } from '@nestjs/testing';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CollaboraDocumentResolverQueries } from './collabora.document.resolver.queries';
import { CollaboraDocumentService } from './collabora.document.service';

describe('CollaboraDocumentResolverQueries', () => {
  let resolver: CollaboraDocumentResolverQueries;
  let collaboraDocumentService: CollaboraDocumentService;
  let authorizationService: AuthorizationService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CollaboraDocumentResolverQueries],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CollaboraDocumentResolverQueries);
    collaboraDocumentService = module.get(CollaboraDocumentService);
    authorizationService = module.get(AuthorizationService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('collaboraEditorUrl', () => {
    it('should report COLLABORA_DOCUMENT_OPENED for the opening actor and return the editor URL', async () => {
      const collaboraDocument = {
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'Quarterly Report' },
      } as any;

      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue(collaboraDocument);
      vi.mocked(collaboraDocumentService.getEditorUrl).mockResolvedValue({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });

      const communityResolverService = (resolver as any)
        .communityResolverService;
      vi.mocked(
        communityResolverService.getCommunityForCollaboraDocumentOrFail
      ).mockResolvedValue({ id: 'community-1' });
      vi.mocked(
        communityResolverService.getLevelZeroSpaceIdForCommunity
      ).mockResolvedValue('space-root');

      const contributionReporter = (resolver as any).contributionReporter;
      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.collaboraEditorUrl(
        actorContext,
        'collab-doc-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(contributionReporter.collaboraDocumentOpened).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'collab-doc-1',
          name: 'Quarterly Report',
          space: 'space-root',
        }),
        actorContext
      );
      expect(result).toEqual({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });
    });
  });
});
