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
