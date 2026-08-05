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

    // Platform default language (language.default in alkemio.yml) — the
    // fallback resolveActorLanguage always returns when there's no explicit
    // account preference.
    const configService = (resolver as any).configService;
    vi.mocked(configService.get).mockReturnValue('en');
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
      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockResolvedValue(undefined);

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      expect(actorLookupService.getActorById).toHaveBeenCalledWith('user-1');
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'user-1',
        'Alice Anderson',
        'en'
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
      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockResolvedValue(undefined);

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      const result = await resolver.collaboraEditorUrl(
        actorContext,
        'collab-doc-1'
      );

      // Lookup failure is swallowed: name omitted, document still opens.
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'user-1',
        undefined,
        'en'
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
      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockResolvedValue(undefined);

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      // '' is coalesced to undefined so WOPI applies its own fallback.
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'user-1',
        undefined,
        'en'
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
      const userService = (resolver as any).userService;
      const actorContext = {
        actorID: 'guest-abc',
        isGuest: true,
        guestName: 'Guest Bob',
      } as any;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      expect(actorLookupService.getActorById).not.toHaveBeenCalled();
      // Guests have no UserSettings — no lookup attempted, but they still get
      // the platform default language rather than no override at all.
      expect(userService.getUserByIdOrFail).not.toHaveBeenCalled();
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'guest-abc',
        'Guest Bob',
        'en'
      );
    });

    it("forwards an authenticated user's Alkemio profile language to the WOPI service", async () => {
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
      vi.mocked(actorLookupService.getActorById).mockResolvedValue(undefined);

      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockResolvedValue({
        settings: { language: 'bg' },
      } as any);

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      expect(userService.getUserByIdOrFail).toHaveBeenCalledWith('user-1', {
        relations: { settings: true },
      });
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'user-1',
        undefined,
        'bg'
      );
    });

    it('falls back to the platform default language for an authenticated User who never chose one', async () => {
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
      vi.mocked(actorLookupService.getActorById).mockResolvedValue(undefined);

      // `null` = has never chosen a language, distinct from a failed lookup.
      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockResolvedValue({
        settings: { language: null },
      } as any);

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'user-1',
        undefined,
        'en'
      );
    });

    it('falls back to the platform default language for non-User actors (organizations, virtual contributors)', async () => {
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
      vi.mocked(actorLookupService.getActorById).mockResolvedValue(undefined);

      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockRejectedValue(
        new Error('not a User actor')
      );

      const actorContext = { actorID: 'org-1', isGuest: false } as any;
      const result = await resolver.collaboraEditorUrl(
        actorContext,
        'collab-doc-1'
      );

      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        'collab-doc-1',
        'org-1',
        undefined,
        'en'
      );
      expect(result).toEqual({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });
    });
  });

  describe('collaboraServiceAvailable', () => {
    it('checks read access then returns WOPI health — with no token issued and no analytics', async () => {
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue({
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
      } as any);
      vi.mocked(
        collaboraDocumentService.isWopiServiceAvailable
      ).mockResolvedValue(true);
      const contributionReporter = (resolver as any).contributionReporter;
      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.collaboraServiceAvailable(
        actorContext,
        'collab-doc-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(result).toBe(true);
      // Side-effect-free health check: no token minted, no analytics recorded.
      expect(collaboraDocumentService.getEditorUrl).not.toHaveBeenCalled();
      expect(
        contributionReporter.collaboraDocumentOpened
      ).not.toHaveBeenCalled();
    });

    it('returns false when the WOPI health check reports the service unavailable', async () => {
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue({
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
      } as any);
      vi.mocked(
        collaboraDocumentService.isWopiServiceAvailable
      ).mockResolvedValue(false);

      const result = await resolver.collaboraServiceAvailable(
        { actorID: 'user-1' } as any,
        'collab-doc-1'
      );
      expect(result).toBe(false);
    });
  });
});
