import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { TagsetType } from '@common/enums/tagset.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IDocument } from '@domain/storage/document';
import { DocumentService } from '@domain/storage/document/document.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Test, TestingModule } from '@nestjs/testing';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { uniqueId } from 'lodash';
import { vi } from 'vitest';
import { IAuthorizationPolicy } from '../common/authorization-policy';
import { ProfileDocumentsService } from './profile.documents.service';

const ALKEMIO_URL = 'https://alkem.io';
const ALKEMIO_DOCUMENT_URL = `${ALKEMIO_URL}/api/private/rest/storage/document`;
const EXAMPLE_DOCUMENT_UUID = '88bd49d1-871d-479a-94b5-d905c93a97de';
const EXAMPLE_ALKEMIO_DOCUMENT_URL = `${ALKEMIO_DOCUMENT_URL}/${EXAMPLE_DOCUMENT_UUID}`;

const mockAuth = (
  type: AuthorizationPolicyType,
  props?: Partial<IAuthorizationPolicy>
): IAuthorizationPolicy => ({
  credentialRules: [],
  privilegeRules: [],
  id: uniqueId(),
  createdDate: new Date(),
  updatedDate: new Date(),
  ...props,
  type,
});

const mockStorageBucket = (props?: Partial<IStorageBucket>): IStorageBucket => {
  return {
    id: uniqueId(),
    documents: [],
    allowedMimeTypes: [],
    maxFileSize: 2000,
    createdDate: new Date(),
    updatedDate: new Date(),
    ...props,
  };
};

const mockDocument = (
  storageBucket: IStorageBucket,
  props?: Partial<IDocument>,
  addToStorageBucket: boolean = true
): IDocument => {
  const doc = {
    id: uniqueId(),
    createdBy: 'user1',
    externalID: uniqueId(),
    displayName: 'img1.png',
    mimeType: MimeTypeVisual.PNG,
    size: 20000,
    tagset: {
      id: 'tagset1',
      name: 'default',
      type: TagsetType.FREEFORM,
      createdDate: new Date(),
      updatedDate: new Date(),
      tags: [],
    },
    authorization: mockAuth(AuthorizationPolicyType.DOCUMENT),
    temporaryLocation: false,
    ...props,
    storageBucket,
    createdDate: new Date(),
    updatedDate: new Date(),
  };
  if (addToStorageBucket) {
    storageBucket.documents.push(doc);
  }
  return doc;
};

describe('ProfileDocumentsService', () => {
  let service: ProfileDocumentsService;
  let documentService: DocumentService;
  let storageBucketService: StorageBucketService;
  let fileServiceAdapter: FileServiceAdapter;
  let authorizationService: AuthorizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileDocumentsService,
        {
          provide: DocumentService,
          useValue: {
            getDocumentsBaseUrlPath: vi.fn(),
            isAlkemioDocumentURL: vi.fn(),
            getDocumentFromURL: vi.fn(),
            getPubliclyAccessibleURL: vi.fn(),
            createDocument: vi.fn(),
            deleteDocument: vi.fn(),
          },
        },
        {
          provide: StorageBucketService,
          useValue: {
            addDocumentToStorageBucketOrFail: vi.fn(),
            uploadFileAsDocumentFromBuffer: vi.fn(),
            copyDocumentToBucket: vi.fn(),
          },
        },
        {
          provide: FileServiceAdapter,
          useValue: {
            createDocument: vi.fn(),
            copyDocument: vi.fn(),
            getDocumentContent: vi.fn(),
            updateDocument: vi.fn(),
            deleteDocument: vi.fn(),
          },
        },
        {
          provide: AuthorizationService,
          useValue: { isAccessGranted: vi.fn().mockReturnValue(false) },
        },
        MockWinstonProvider,
      ],
    }).compile();

    service = module.get<ProfileDocumentsService>(ProfileDocumentsService);
    documentService = module.get<DocumentService>(DocumentService);
    storageBucketService =
      module.get<StorageBucketService>(StorageBucketService);
    fileServiceAdapter = module.get<FileServiceAdapter>(FileServiceAdapter);
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
  });
  describe('reuploadFileOnStorageBucket', () => {
    it('should throw EntityNotInitializedException when storageBucket.documents is not initialized', async () => {
      const fileUrl = EXAMPLE_ALKEMIO_DOCUMENT_URL;
      const storageBucket = mockStorageBucket({
        documents: undefined as any,
      });

      vi.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);

      await expect(
        service.reuploadFileOnStorageBucket(fileUrl, storageBucket, true)
      ).rejects.toThrow('Documents not initialized on storage bucket');
    });

    it('returns undefined (with WARN log) when the Alkemio document URL is stale', async () => {
      // Stale/orphan URL handling: the helper used to throw, which crashed
      // entire clone flows on a single dead reference. Now it logs a
      // warning and returns undefined; callers (markdown walker,
      // references, visuals, mediaGallery, whiteboard) all handle
      // undefined gracefully.
      const fileUrl = EXAMPLE_ALKEMIO_DOCUMENT_URL;
      const storageBucket = mockStorageBucket();

      vi.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
      vi.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue(
        undefined as any
      );

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucket,
        true
      );
      expect(result).toBeUndefined();
    });

    it('should return fileUrl if internalUrlRequired is false and URL is not an Alkemio document', async () => {
      const fileUrl = 'http://external.com/doc/1234';
      const storageBucket = mockStorageBucket();

      vi.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(false);

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucket,
        false
      );

      expect(result).toBe(fileUrl);
    });

    it('should return undefined if internalUrlRequired is true and URL is not an Alkemio document', async () => {
      const fileUrl = 'http://external.com/doc/1234';
      const storageBucket = mockStorageBucket();

      vi.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(false);

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucket,
        true
      );

      expect(result).toBeUndefined();
    });

    it('should return the same url if the file is already in the same stoarge bucket', async () => {
      const fileUrl = EXAMPLE_ALKEMIO_DOCUMENT_URL;
      const storageBucket: IStorageBucket = mockStorageBucket();
      const doc = mockDocument(storageBucket);

      vi.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
      vi.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue(doc);
      vi.spyOn(documentService, 'getPubliclyAccessibleURL').mockReturnValue(
        EXAMPLE_ALKEMIO_DOCUMENT_URL
      );

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucket,
        true
      );

      expect(result).toBe(fileUrl);
    });

    it('should return the same document but moved to the new StorageBucket and not temporary anymore', async () => {
      const fileUrl = EXAMPLE_ALKEMIO_DOCUMENT_URL;
      const storageBucketOrigin: IStorageBucket = mockStorageBucket();
      const storageBucketDestination: IStorageBucket = mockStorageBucket();
      // A few test documents
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketDestination);
      mockDocument(storageBucketDestination);
      // the doc — registered on the source bucket only (not destination)
      const doc = mockDocument(
        storageBucketOrigin,
        { temporaryLocation: true },
        true /* addToStorageBucket */
      );
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketDestination);

      const destDocsBefore = [...storageBucketDestination.documents];

      vi.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
      vi.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue(doc);
      vi.spyOn(documentService, 'getPubliclyAccessibleURL').mockReturnValue(
        EXAMPLE_ALKEMIO_DOCUMENT_URL
      );
      vi.spyOn(fileServiceAdapter, 'updateDocument').mockResolvedValue({
        id: doc.id,
        storageBucketId: storageBucketDestination.id,
        temporaryLocation: false,
      });

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucketDestination,
        true
      );

      expect(result).toBe(fileUrl);
      expect(fileServiceAdapter.updateDocument).toHaveBeenCalledWith(doc.id, {
        storageBucketId: storageBucketDestination.id,
        temporaryLocation: false,
      });
      // The helper must NOT mutate `bucket.documents` in memory — that's
      // what triggers TypeORM's bidirectional FK-sync write on the next
      // parent save (DocumentWriteGuard rejects it). file-service-go has
      // already updated the FK in DB; in-memory state must stay neutral.
      expect(storageBucketDestination.documents).toEqual(destDocsBefore);
      // The helper must NOT mutate the loaded Document instance —
      // TypeORM tracks loaded entities and any property change on a
      // tracked Document is a candidate for an UPDATE on the next save.
      expect(doc.temporaryLocation).toBe(true);
    });

    it('copies the document via copyDocumentToBucket and leaves the source intact', async () => {
      // Different-bucket branch: COPY semantics. The previous MOVE
      // semantics (copy + delete-source) destroyed the source's content
      // during clone flows: editing a cloned WB silently deleted the
      // original doc, breaking the source's WB visuals and leaving
      // subsequent clones from the same source referencing now-gone
      // docs (404 visuals on later space-from-template creations).
      // Source ownership is the caller's concern.
      const fileUrl = `${ALKEMIO_URL}/api/private/rest/storage/document/${uniqueId()}`;
      const storageBucketOrigin: IStorageBucket = mockStorageBucket();
      const storageBucketDestination: IStorageBucket = mockStorageBucket();
      const doc = mockDocument(storageBucketOrigin, {
        temporaryLocation: false,
      });

      vi.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
      vi.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue(doc);
      const resultUrl = `${ALKEMIO_URL}/api/private/rest/storage/document/${uniqueId()}`;
      vi.spyOn(documentService, 'getPubliclyAccessibleURL').mockReturnValue(
        resultUrl
      );

      const newDocMock = mockDocument(storageBucketDestination, {
        ...doc,
        id: uniqueId(),
      });
      vi.spyOn(storageBucketService, 'copyDocumentToBucket').mockResolvedValue(
        newDocMock
      );

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucketDestination,
        true,
        { sourceStorageBucketID: storageBucketOrigin.id }
      );

      expect(result).toBe(resultUrl);
      expect(result !== fileUrl).toBe(true);
      expect(fileServiceAdapter.getDocumentContent).not.toHaveBeenCalled();
      // skipDedup=true is required so we never bind the new bucket's
      // reference to a doc owned by another caller (see service comment).
      expect(storageBucketService.copyDocumentToBucket).toHaveBeenCalledWith(
        storageBucketDestination.id,
        doc,
        undefined,
        true
      );
      // Source must NOT be deleted. Cloning flows depend on the source
      // remaining intact; deletion would corrupt the source's content
      // and any other clones that reference the same source doc.
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });

    describe('copying a file stored in another bucket', () => {
      const setup = () => {
        const fileUrl = `${ALKEMIO_URL}/api/private/rest/storage/document/${uniqueId()}`;
        const origin = mockStorageBucket();
        const destination = mockStorageBucket();
        const doc = mockDocument(origin, { temporaryLocation: false });
        vi.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
        vi.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue(doc);
        const copiedUrl = `${ALKEMIO_URL}/api/private/rest/storage/document/${uniqueId()}`;
        vi.spyOn(documentService, 'getPubliclyAccessibleURL').mockReturnValue(
          copiedUrl
        );
        vi.spyOn(
          storageBucketService,
          'copyDocumentToBucket'
        ).mockResolvedValue(
          mockDocument(destination, { id: uniqueId() }, false)
        );
        return { fileUrl, origin, destination, doc, copiedUrl };
      };

      it('leaves the URL exactly as written when no one is entitled to the copy', async () => {
        const { fileUrl, destination } = setup();

        const result = await service.reuploadFileOnStorageBucket(
          fileUrl,
          destination
        );

        expect(result).toBe(fileUrl);
        expect(
          storageBucketService.copyDocumentToBucket
        ).not.toHaveBeenCalled();
      });

      it('leaves the URL exactly as written when the actor cannot READ the file', async () => {
        const { fileUrl, destination, doc } = setup();
        const actorContext = new ActorContext();
        vi.mocked(authorizationService.isAccessGranted).mockReturnValue(false);

        const result = await service.reuploadFileOnStorageBucket(
          fileUrl,
          destination,
          false,
          { actorContext }
        );

        expect(result).toBe(fileUrl);
        expect(authorizationService.isAccessGranted).toHaveBeenCalledWith(
          actorContext,
          doc.authorization,
          'read'
        );
        expect(
          storageBucketService.copyDocumentToBucket
        ).not.toHaveBeenCalled();
      });

      it('copies the file when the actor can READ it', async () => {
        const { fileUrl, destination, doc, copiedUrl } = setup();
        vi.mocked(authorizationService.isAccessGranted).mockReturnValue(true);

        const result = await service.reuploadFileOnStorageBucket(
          fileUrl,
          destination,
          false,
          { actorContext: new ActorContext() }
        );

        expect(result).toBe(copiedUrl);
        expect(storageBucketService.copyDocumentToBucket).toHaveBeenCalledWith(
          destination.id,
          doc,
          undefined,
          true
        );
      });

      it('copies a file from the server-chosen source bucket without a per-file check', async () => {
        const { fileUrl, origin, destination, copiedUrl } = setup();

        const result = await service.reuploadFileOnStorageBucket(
          fileUrl,
          destination,
          false,
          { sourceStorageBucketID: origin.id }
        );

        expect(result).toBe(copiedUrl);
        expect(authorizationService.isAccessGranted).not.toHaveBeenCalled();
      });

      it('does not treat a file from a different bucket as coming from the source', async () => {
        const { fileUrl, destination } = setup();

        const result = await service.reuploadFileOnStorageBucket(
          fileUrl,
          destination,
          false,
          { sourceStorageBucketID: 'some-other-bucket' }
        );

        expect(result).toBe(fileUrl);
        expect(
          storageBucketService.copyDocumentToBucket
        ).not.toHaveBeenCalled();
      });

      it('keeps an unreadable file URL unchanged inside markdown', async () => {
        const { fileUrl, destination } = setup();
        vi.spyOn(documentService, 'getDocumentsBaseUrlPath').mockReturnValue(
          ALKEMIO_DOCUMENT_URL
        );
        const unreadableUrl = `${ALKEMIO_DOCUMENT_URL}/${EXAMPLE_DOCUMENT_UUID}`;
        const markdown = `![x](${unreadableUrl}) and ${fileUrl}`;

        const result = await service.reuploadDocumentsInMarkdownToStorageBucket(
          markdown,
          destination,
          { actorContext: new ActorContext() }
        );

        expect(result).toBe(markdown);
        expect(
          storageBucketService.copyDocumentToBucket
        ).not.toHaveBeenCalled();
      });
    });

    describe('reuploadDocumentsInMarkdownProfile', () => {
      it('should leave markdown as is if no document urls', async () => {
        const markdown =
          'Some text with an external URL: https://example.com/test/image.png\n\nMarkdown Link asf dsa [link](https://example.com/test/image2.png) fdsafdsa dsdsfdsfsd dsa d fda <img src="http://example.com/test/image3.png" alt="image in html"/> <a href="https://alkem.io" />';
        const storageBucketDestination = mockStorageBucket();

        vi.spyOn(documentService, 'getDocumentsBaseUrlPath').mockReturnValue(
          ALKEMIO_DOCUMENT_URL
        );

        const result = await service.reuploadDocumentsInMarkdownToStorageBucket(
          markdown,
          storageBucketDestination
        );

        expect(result).toBe(markdown);
      });

      it('should replace alkemio document urls from documents when not in the same StorageBucket', async () => {
        const markdown = `Some text with a document URL: ${EXAMPLE_ALKEMIO_DOCUMENT_URL} and another one with an alkemio url fdsafdsa  [${EXAMPLE_ALKEMIO_DOCUMENT_URL}](${EXAMPLE_ALKEMIO_DOCUMENT_URL}) dsdsfdsfsd dsa d fda`;
        const resultUrl = `${ALKEMIO_URL}/api/private/rest/storage/document/${uniqueId()}`;
        const markdownResult = `Some text with a document URL: ${resultUrl} and another one with an alkemio url fdsafdsa  [${resultUrl}](${resultUrl}) dsdsfdsfsd dsa d fda`;

        const storageBucketDestination = mockStorageBucket();
        const doc = mockDocument(storageBucketDestination);

        vi.spyOn(documentService, 'getDocumentsBaseUrlPath').mockReturnValue(
          ALKEMIO_DOCUMENT_URL
        );

        vi.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
        vi.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue(doc);

        vi.spyOn(documentService, 'getPubliclyAccessibleURL').mockReturnValue(
          resultUrl
        );

        // Doc is already in storageBucketDestination.documents so the early-return path is taken

        const result = await service.reuploadDocumentsInMarkdownToStorageBucket(
          markdown,
          storageBucketDestination
        );

        expect(result).toBe(markdownResult);
        expect(storageBucketDestination.documents).toHaveLength(1);
      });
    });
  });
});
