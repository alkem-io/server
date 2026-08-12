import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CollaboraDocumentResolverQueries } from './collabora.document.resolver.queries';
import { CollaboraDocumentService } from './collabora.document.service';
import {
  COLLABORA_DOCUMENT_OPENED,
  CollaboraDocumentOpened,
} from './events/collabora.document.analytics.events';
import { CollaboraDocumentEventsService } from './events/collabora.document.events.service';

describe('CollaboraDocumentResolverQueries', () => {
  let resolver: CollaboraDocumentResolverQueries;
  let collaboraDocumentService: CollaboraDocumentService;
  let authorizationService: AuthorizationService;
  let eventEmitter: EventEmitter2;
  let collaboraDocumentEventsService: CollaboraDocumentEventsService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      // MockWinstonProvider listed explicitly (not left to useMocker's
      // dictionary lookup): useMocker returns the {provide, useValue}
      // wrapper as if it were the resolved value for string-token
      // dictionary entries, so `resolver.logger.warn` etc. would otherwise
      // be undefined rather than a spy.
      providers: [
        CollaboraDocumentResolverQueries,
        CollaboraDocumentEventsService,
        { provide: EventEmitter2, useValue: new EventEmitter2() },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CollaboraDocumentResolverQueries);
    collaboraDocumentService = module.get(CollaboraDocumentService);
    authorizationService = module.get(AuthorizationService);
    eventEmitter = module.get(EventEmitter2);
    collaboraDocumentEventsService = module.get(CollaboraDocumentEventsService);

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
    it('loads profile and backing document once and passes the loaded entity to token issuance', async () => {
      const collaboraDocument = {
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'Quarterly Report' },
        document: { id: 'storage-document-1' },
      } as any;
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue(collaboraDocument);
      vi.mocked(collaboraDocumentService.getEditorUrl).mockResolvedValue({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });

      await resolver.collaboraEditorUrl(
        {
          actorID: 'guest-1',
          isGuest: true,
          guestName: 'Guest One',
        } as any,
        'collab-doc-1'
      );

      expect(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).toHaveBeenCalledOnce();
      expect(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).toHaveBeenCalledWith('collab-doc-1', {
        relations: { profile: true, document: true },
      });
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        collaboraDocument,
        'guest-1',
        'Guest One',
        'en'
      );
    });

    it('publishes one opened event without waiting for its pending listener and returns the editor URL', async () => {
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

      let event: CollaboraDocumentOpened | undefined;
      eventEmitter.on(COLLABORA_DOCUMENT_OPENED, opened => {
        event = opened;
        return new Promise(() => undefined);
      });
      const publishSpy = vi.spyOn(
        collaboraDocumentEventsService,
        'publishOpened'
      );
      const actorContext = {
        actorID: 'user-1',
        isAnonymous: false,
        isGuest: true,
        guestName: 'Opening Guest',
      } as any;

      const result = await resolver.collaboraEditorUrl(
        actorContext,
        'collab-doc-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(publishSpy).toHaveBeenCalledOnce();
      expect(publishSpy).toHaveBeenCalledWith(
        'collab-doc-1',
        'Quarterly Report',
        actorContext
      );
      expect(event).toBeInstanceOf(CollaboraDocumentOpened);
      expect(event).toMatchObject({
        id: 'collab-doc-1',
        name: 'Quarterly Report',
      });
      expect(result).toEqual({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });
    });

    it('does not publish when read authorization fails', async () => {
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue({
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'Quarterly Report' },
      } as any);
      vi.mocked(authorizationService.grantAccessOrFail).mockImplementation(
        () => {
          throw new Error('authorization denied');
        }
      );
      const publishSpy = vi.spyOn(
        collaboraDocumentEventsService,
        'publishOpened'
      );

      await expect(
        resolver.collaboraEditorUrl(
          { actorID: 'user-1', isGuest: false } as any,
          'collab-doc-1'
        )
      ).rejects.toThrow('authorization denied');

      expect(publishSpy).not.toHaveBeenCalled();
    });

    it('does not publish when editor URL resolution fails', async () => {
      vi.mocked(
        collaboraDocumentService.getCollaboraDocumentOrFail
      ).mockResolvedValue({
        id: 'collab-doc-1',
        authorization: { id: 'auth-1' },
        profile: { displayName: 'Quarterly Report' },
      } as any);
      vi.mocked(collaboraDocumentService.getEditorUrl).mockRejectedValue(
        new Error('WOPI unavailable')
      );
      const publishSpy = vi.spyOn(
        collaboraDocumentEventsService,
        'publishOpened'
      );

      await expect(
        resolver.collaboraEditorUrl(
          { actorID: 'user-1', isGuest: false } as any,
          'collab-doc-1'
        )
      ).rejects.toThrow('WOPI unavailable');

      expect(publishSpy).not.toHaveBeenCalled();
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
      // getUserByIdOrFail never resolves undefined in production — it
      // resolves a User or throws. Reject, matching its real contract.
      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockRejectedValue(
        new Error('not a User actor')
      );

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      expect(actorLookupService.getActorById).toHaveBeenCalledWith('user-1');
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'collab-doc-1' }),
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
      // getUserByIdOrFail never resolves undefined in production — it
      // resolves a User or throws. Reject, matching its real contract.
      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockRejectedValue(
        new Error('not a User actor')
      );

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      const result = await resolver.collaboraEditorUrl(
        actorContext,
        'collab-doc-1'
      );

      // Lookup failure is swallowed: name omitted, document still opens.
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'collab-doc-1' }),
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
      // getUserByIdOrFail never resolves undefined in production — it
      // resolves a User or throws. Reject, matching its real contract.
      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockRejectedValue(
        new Error('not a User actor')
      );

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      // '' is coalesced to undefined so WOPI applies its own fallback.
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'collab-doc-1' }),
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
      const configService = (resolver as any).configService;
      await resolver.collaboraEditorUrl(actorContext, 'collab-doc-1');

      expect(actorLookupService.getActorById).not.toHaveBeenCalled();
      // Guests have no UserSettings — no lookup attempted, but they still get
      // the platform default language rather than no override at all.
      expect(userService.getUserByIdOrFail).not.toHaveBeenCalled();
      expect(configService.get).toHaveBeenCalledWith('language.default', {
        infer: true,
      });
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'collab-doc-1' }),
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
        expect.objectContaining({ id: 'collab-doc-1' }),
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
        expect.objectContaining({ id: 'collab-doc-1' }),
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

      // The real getUserByIdOrFail contract for a non-existent/non-User id.
      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockRejectedValue(
        new EntityNotFoundException('not found', LogContext.COLLABORATION)
      );

      const actorContext = { actorID: 'org-1', isGuest: false } as any;
      const result = await resolver.collaboraEditorUrl(
        actorContext,
        'collab-doc-1'
      );

      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'collab-doc-1' }),
        'org-1',
        undefined,
        'en'
      );
      expect(result).toEqual({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });
      // Expected outcome (non-User actor) — quiet, not an operational alert.
      const logger = (resolver as any).logger;
      expect(logger.verbose).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('logs at warn (not verbose) when the language lookup fails for a reason other than "not found"', async () => {
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

      // A genuine infrastructure failure, not "actor isn't a User" — this
      // must stay operationally visible rather than blend into the
      // expected-non-User-actor noise.
      const userService = (resolver as any).userService;
      vi.mocked(userService.getUserByIdOrFail).mockRejectedValue(
        new Error('connection to database lost')
      );

      const actorContext = { actorID: 'user-1', isGuest: false } as any;
      const result = await resolver.collaboraEditorUrl(
        actorContext,
        'collab-doc-1'
      );

      // Still best-effort: the document opens regardless.
      expect(collaboraDocumentService.getEditorUrl).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'collab-doc-1' }),
        'user-1',
        undefined,
        'en'
      );
      expect(result).toEqual({
        editorUrl: 'https://collabora/editor',
        accessTokenTTL: 3600,
      });
      const logger = (resolver as any).logger;
      expect(logger.warn).toHaveBeenCalled();
      expect(logger.verbose).not.toHaveBeenCalled();
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
      const publishSpy = vi.spyOn(
        collaboraDocumentEventsService,
        'publishOpened'
      );
      const actorContext = { actorID: 'user-1' } as any;

      const result = await resolver.collaboraServiceAvailable(
        actorContext,
        'collab-doc-1'
      );

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
      expect(result).toBe(true);
      // Side-effect-free health check: no token minted, no analytics recorded.
      expect(collaboraDocumentService.getEditorUrl).not.toHaveBeenCalled();
      expect(publishSpy).not.toHaveBeenCalled();
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
