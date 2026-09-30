import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { CollaboraDocumentResolverFields } from './collabora.document.resolver.fields';
import { CollaboraDocumentService } from './collabora.document.service';

describe('CollaboraDocumentResolverFields', () => {
  let resolver: CollaboraDocumentResolverFields;
  let collaboraDocumentService: CollaboraDocumentService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CollaboraDocumentResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(CollaboraDocumentResolverFields);
    collaboraDocumentService = module.get(CollaboraDocumentService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('previewUrl', () => {
    it('resolves to the URL the service builds for a present backing file', async () => {
      vi.mocked(collaboraDocumentService.getPreviewUrl).mockResolvedValue(
        '/api/private/wopi/files/file-1/preview'
      );

      const result = await resolver.previewUrl({ id: 'collab-doc-1' } as any);

      expect(collaboraDocumentService.getPreviewUrl).toHaveBeenCalledWith(
        'collab-doc-1'
      );
      expect(result).toBe('/api/private/wopi/files/file-1/preview');
    });

    it('resolves to null when the CollaboraDocument has no backing file relation', async () => {
      vi.mocked(collaboraDocumentService.getPreviewUrl).mockResolvedValue(null);

      const result = await resolver.previewUrl({ id: 'collab-doc-2' } as any);

      expect(result).toBeNull();
    });

    it("forwards the CollaboraDocument id verbatim, so URL encoding of the stable fileID stays the service's single responsibility", async () => {
      vi.mocked(collaboraDocumentService.getPreviewUrl).mockResolvedValue(
        '/api/private/wopi/files/file%2Fwith%20space/preview'
      );

      await resolver.previewUrl({ id: 'collab-doc-3' } as any);

      expect(collaboraDocumentService.getPreviewUrl).toHaveBeenCalledTimes(1);
      expect(collaboraDocumentService.getPreviewUrl).toHaveBeenCalledWith(
        'collab-doc-3'
      );
    });

    it('builds the URL from an already-loaded document relation, issuing no query of its own', async () => {
      const result = await resolver.previewUrl({
        id: 'collab-doc-4',
        document: { id: 'file-4' },
      } as any);

      expect(result).toBe('/api/private/wopi/files/file-4/preview');
      // The callout framing and contribution accessors load `document` for
      // every CollaboraDocument they return, so a board of N documents must
      // cost zero extra queries here.
      expect(collaboraDocumentService.getPreviewUrl).not.toHaveBeenCalled();
    });

    it('treats a loaded-but-null document as genuinely absent, not as "not loaded"', async () => {
      const result = await resolver.previewUrl({
        id: 'collab-doc-5',
        document: null,
      } as any);

      expect(result).toBeNull();
      expect(collaboraDocumentService.getPreviewUrl).not.toHaveBeenCalled();
    });

    it('encodes the fileID identically on the preloaded and the re-query paths', async () => {
      const preloaded = await resolver.previewUrl({
        id: 'collab-doc-6',
        document: { id: 'file/with space' },
      } as any);

      expect(preloaded).toBe(
        '/api/private/wopi/files/file%2Fwith%20space/preview'
      );
    });

    it('carries no privilege metadata of its own, matching the unguarded profile/createdBy fields on this resolver (the normal CollaboraDocument object-level authorization is unaffected)', () => {
      const descriptor = Object.getOwnPropertyDescriptor(
        CollaboraDocumentResolverFields.prototype,
        'previewUrl'
      );
      expect(descriptor).toBeDefined();
      expect(
        Reflect.getMetadata('privilege', descriptor!.value)
      ).toBeUndefined();
    });
  });
});
