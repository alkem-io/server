import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfileDocumentsService } from './profile.documents.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { IStorageBucket } from '@domain/storage/storage-bucket/storage.bucket.interface';
import { uniqueId } from 'lodash';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { IAuthorizationPolicy } from '../common/authorization-policy';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { TagsetType } from '@common/enums/tagset.type';
import { IDocument } from '@domain/storage/document';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';

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
          },
        },
        {
          provide: StorageBucketService,
          useValue: {
            addDocumentToStorageBucketOrFail: vi.fn(),
          },
        },
        {
          provide: DocumentAuthorizationService,
          useValue: {
            applyAuthorizationPolicy: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileDocumentsService>(ProfileDocumentsService);
    documentService = module.get<DocumentService>(DocumentService);
    storageBucketService =
      module.get<StorageBucketService>(StorageBucketService);
  });
  describe('reuploadFileOnStorageBucket', () => {
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
      // the doc
      const doc = mockDocument(storageBucketOrigin, {
        temporaryLocation: true,
      });
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketDestination);

      vi.spyOn(documentService, 'isAlkemioDocumentURL').mockReturnValue(true);
      vi.spyOn(documentService, 'getDocumentFromURL').mockResolvedValue(doc);
      vi.spyOn(documentService, 'getPubliclyAccessibleURL').mockReturnValue(
        EXAMPLE_ALKEMIO_DOCUMENT_URL
      );

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucketDestination,
        true
      );

      expect(result).toBe(fileUrl);
      expect(doc.temporaryLocation).toBe(false);
      expect(doc.storageBucket).toBe(storageBucketDestination);
    });

    it('should return a copy of the document in the new StorageBucket', async () => {
      const fileUrl = `${ALKEMIO_URL}/api/private/rest/storage/document/${uniqueId()}`;
      const storageBucketOrigin: IStorageBucket = mockStorageBucket();
      const storageBucketDestination: IStorageBucket = mockStorageBucket();
      // A few test documents
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketDestination);
      mockDocument(storageBucketDestination);
      // the doc
      const doc = mockDocument(storageBucketOrigin, {
        temporaryLocation: false,
      });
      mockDocument(storageBucketOrigin);
      mockDocument(storageBucketDestination);

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
      vi.spyOn(documentService, 'createDocument').mockResolvedValue(newDocMock);
      vi.spyOn(
        storageBucketService,
        'addDocumentToStorageBucketOrFail'
      ).mockResolvedValue(newDocMock);

      const result = await service.reuploadFileOnStorageBucket(
        fileUrl,
        storageBucketDestination,
        true
      );

      expect(result).toBe(resultUrl);
      expect(result !== fileUrl).toBe(true);
      expect(storageBucketDestination.documents).toHaveLength(4);
      const newDoc = storageBucketDestination.documents[3];
      expect(newDoc.storageBucket).toBe(storageBucketDestination);
      expect(newDoc.id === doc.id).toBe(false);
      expect(newDoc.externalID).toBe(doc.externalID);
      expect(newDoc.temporaryLocation).toBe(false);
      expect(newDoc.displayName).toBe(doc.displayName);
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

        vi.spyOn(documentService, 'createDocument').mockResolvedValue(doc);
        vi.spyOn(
          storageBucketService,
          'addDocumentToStorageBucketOrFail'
        ).mockResolvedValue(doc);

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
