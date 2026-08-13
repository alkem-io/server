import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CollaboraDocumentEventsService } from '@domain/collaboration/collabora-document/events/collabora.document.events.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CollaboraDocumentResolverMutations } from './collabora.document.resolver.mutations';
import { CollaboraDocumentService } from './collabora.document.service';

vi.mock('@common/utils/file.util', () => ({
  streamToBuffer: vi.fn().mockResolvedValue(Buffer.from('new-bytes')),
}));

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('CollaboraDocumentResolverMutations', () => {
  let resolver: CollaboraDocumentResolverMutations;
  let authorizationService: AuthorizationService;
  let collaboraDocumentService: CollaboraDocumentService;
  let collaboraDocumentEventsService: CollaboraDocumentEventsService;

  const fileUpload = () =>
    ({
      createReadStream: vi.fn(),
      filename: 'report.xlsx',
      mimetype: XLSX_MIME,
    }) as any;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaboraDocumentResolverMutations,
        {
          provide: CollaboraDocumentEventsService,
          useValue: {
            publishOpened: vi.fn(),
            publishReplaced: vi.fn(),
            publishUploaded: vi.fn(),
          },
        },
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CollaboraDocumentResolverMutations);
    authorizationService = module.get(AuthorizationService);
    collaboraDocumentService = module.get(CollaboraDocumentService);
    collaboraDocumentEventsService = module.get(CollaboraDocumentEventsService);
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
        collaboraDocumentService.updateCollaboraDocument
      ).mockResolvedValue({
        id: 'collab-doc-1',
        profile: { displayName: 'A New Title' },
      } as any);
    };

    it('enforces UPDATE, completes swap and rename, then publishes one replaced event', async () => {
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

      // The file swap is called with id/buffer/filename/mime/actorID only …
      expect(
        collaboraDocumentService.replaceCollaboraDocument
      ).toHaveBeenCalledWith(
        'collab-doc-1',
        expect.any(Buffer),
        'report.xlsx',
        XLSX_MIME,
        'user-1'
      );

      // … then the chosen title is persisted as the display name via the rename
      // path, keeping the same document entity.
      expect(
        collaboraDocumentService.updateCollaboraDocument
      ).toHaveBeenCalledWith('collab-doc-1', 'A New Title');

      expect(
        collaboraDocumentEventsService.publishReplaced
      ).toHaveBeenCalledOnce();
      expect(
        collaboraDocumentEventsService.publishReplaced
      ).toHaveBeenCalledWith('collab-doc-1', 'A New Title', actorContext);
      expect(
        vi.mocked(collaboraDocumentService.replaceCollaboraDocument).mock
          .invocationCallOrder[0]
      ).toBeLessThan(
        vi.mocked(collaboraDocumentService.updateCollaboraDocument).mock
          .invocationCallOrder[0]
      );
      expect(
        vi.mocked(collaboraDocumentService.updateCollaboraDocument).mock
          .invocationCallOrder[0]
      ).toBeLessThan(
        vi.mocked(collaboraDocumentEventsService.publishReplaced).mock
          .invocationCallOrder[0]
      );

      expect(result.id).toBe('collab-doc-1');
    });

    it('does not rename when no title is supplied', async () => {
      wireHappyPath();

      await resolver.replaceCollaboraDocument(
        { actorID: 'user-1' } as any,
        { ID: 'collab-doc-1' },
        fileUpload()
      );

      expect(
        collaboraDocumentService.updateCollaboraDocument
      ).not.toHaveBeenCalled();
    });

    it('still returns the swapped document when persisting the chosen title fails (best-effort, no double-swap)', async () => {
      wireHappyPath();
      vi.mocked(
        collaboraDocumentService.updateCollaboraDocument
      ).mockRejectedValue(new Error('file-service blip'));

      const result = await resolver.replaceCollaboraDocument(
        { actorID: 'user-1' } as any,
        { ID: 'collab-doc-1', displayName: 'A New Title' },
        fileUpload()
      );

      // The already-committed swap is returned; the mutation does not throw
      // (which would prompt a client retry → a second swap).
      expect(result.id).toBe('collab-doc-1');
      expect(
        collaboraDocumentService.replaceCollaboraDocument
      ).toHaveBeenCalledTimes(1);
      expect(
        collaboraDocumentEventsService.publishReplaced
      ).toHaveBeenCalledWith(
        'collab-doc-1',
        'Quarterly Report',
        expect.objectContaining({ actorID: 'user-1' })
      );
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
      expect(
        collaboraDocumentEventsService.publishReplaced
      ).not.toHaveBeenCalled();
    });

    it('does not publish when replacement fails', async () => {
      wireHappyPath();
      vi.mocked(
        collaboraDocumentService.replaceCollaboraDocument
      ).mockRejectedValue(new Error('replacement failed'));

      await expect(
        resolver.replaceCollaboraDocument(
          { actorID: 'user-1' } as any,
          { ID: 'collab-doc-1' },
          fileUpload()
        )
      ).rejects.toThrow('replacement failed');

      expect(
        collaboraDocumentEventsService.publishReplaced
      ).not.toHaveBeenCalled();
    });
  });
});
