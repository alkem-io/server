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

    it("forwards an authenticated user's profile display name to the WOPI service (#6170)", async () => {
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue({
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'Quarterly Report' },
      } as any);
      vi.mocked(collaboraDocumentService.getEditorUrl).mockResolvedValue({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });

      const actorLookupService = (resolver as any).actorLookupService;
      vi.mocked(actorLookupService.getActorById).mockResolvedValue({
        profile: { displayName: 'Alice Anderson' },
        nameID: 'alice',
      } as any);

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      expect(actorLookupService.getActorById).toHaveBeenCalledWith('user-1');
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'user-1',
        'Alice Anderson'
      );
    });

    it('still returns the editor URL when actor-name resolution fails (best-effort, #6170)', async () => {
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue({
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'Quarterly Report' },
      } as any);
      vi.mocked(collaboraDocumentService.getEditorUrl).mockResolvedValue({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });

      const actorLookupService = (resolver as any).actorLookupService;
      vi.mocked(actorLookupService.getActorById).mockRejectedValue(
        new Error('db down')
      );

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      const result = await resolver.collaboraEditorUrl(
        actorContext,
        'collab-doc-1'
      );

      // Lookup failure is swallowed: name omitted, document still opens.
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'user-1',
        undefined
      );
      expect(result).toEqual({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });
    });

    it('forwards undefined (not an empty string) when the actor has no display name', async () => {
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue({
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'Quarterly Report' },
      } as any);
      vi.mocked(collaboraDocumentService.getEditorUrl).mockResolvedValue({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });

      const actorLookupService = (resolver as any).actorLookupService;
      // Blank displayName and empty nameID → getActorDisplayName returns ''.
      vi.mocked(actorLookupService.getActorById).mockResolvedValue({
        profile: { displayName: '  ' },
        nameID: '',
      } as any);

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      // '' is coalesced to undefined so WOPI applies its own fallback.
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'user-1',
        undefined
      );
    });

    it('uses the guest name from the ActorContext without an actor lookup (#6170)', async () => {
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue({
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'Quarterly Report' },
      } as any);
      vi.mocked(collaboraDocumentService.getEditorUrl).mockResolvedValue({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });

      const actorLookupService = (resolver as any).actorLookupService;
      const actorContext = {
        actorID: 'guest-abc',
        isGuest: true,
        guestName: 'Guest Bob',
      } as any;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      expect(actorLookupService.getActorById).not.toHaveBeenCalled();
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'guest-abc',
        'Guest Bob'
      );
    });
  });
});
