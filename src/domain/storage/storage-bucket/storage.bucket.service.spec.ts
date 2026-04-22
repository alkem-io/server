import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import {
  DEFAULT_ALLOWED_MIME_TYPES,
  MimeFileType,
} from '@common/enums/mime.file.type';
import { MimeTypeDocument } from '@common/enums/mime.file.type.document';
import { MimeTypeVisual } from '@common/enums/mime.file.type.visual';
import { ValidationException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Profile } from '@domain/common/profile/profile.entity';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { AvatarCreatorService } from '@services/external/avatar-creator/avatar.creator.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { Document } from '../document/document.entity';
import { IDocument } from '../document/document.interface';
import { DocumentService } from '../document/document.service';
import { StorageBucket } from './storage.bucket.entity';
import { IStorageBucket } from './storage.bucket.interface';
import { StorageBucketService } from './storage.bucket.service';

// ── Helpers ───────────────────────────────────────────────────────

let idCounter = 0;
const nextId = () => `id-${++idCounter}`;

const mockStorageBucket = (
  overrides?: Partial<IStorageBucket>
): IStorageBucket => ({
  id: nextId(),
  documents: [],
  allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,
  maxFileSize: 15728640, // 15 MB default
  createdDate: new Date(),
  updatedDate: new Date(),
  ...overrides,
});

const mockDocument = (overrides?: Partial<IDocument>): IDocument =>
  ({
    id: nextId(),
    displayName: 'test.png',
    mimeType: MimeTypeVisual.PNG,
    size: 1024,
    externalID: nextId(),
    temporaryLocation: false,
    createdDate: new Date(),
    updatedDate: new Date(),
    authorization: {
      id: nextId(),
      type: AuthorizationPolicyType.DOCUMENT,
      credentialRules: [],
      privilegeRules: [],
      createdDate: new Date(),
      updatedDate: new Date(),
    },
    tagset: {
      id: nextId(),
      name: 'default',
      tags: [],
      createdDate: new Date(),
      updatedDate: new Date(),
    },
    ...overrides,
  }) as any;

describe('StorageBucketService', () => {
  let service: StorageBucketService;
  let storageBucketRepository: Repository<StorageBucket>;
  let _documentRepository: Repository<Document>;
  let profileRepository: Repository<Profile>;
  let documentService: DocumentService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let authorizationService: AuthorizationService;
  let avatarCreatorService: AvatarCreatorService;
  let urlGeneratorService: UrlGeneratorService;
  let fileServiceAdapter: FileServiceAdapter;
  let tagsetService: TagsetService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    idCounter = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageBucketService,
        repositoryProviderMockFactory(StorageBucket),
        repositoryProviderMockFactory(Document),
        repositoryProviderMockFactory(Profile),
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: FileServiceAdapter,
          useValue: {
            createDocument: vi.fn(),
            getDocumentContent: vi.fn(),
            updateDocument: vi.fn(),
            deleteDocument: vi.fn(),
          },
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<StorageBucketService>(StorageBucketService);
    storageBucketRepository = module.get<Repository<StorageBucket>>(
      getRepositoryToken(StorageBucket)
    );
    _documentRepository = module.get<Repository<Document>>(
      getRepositoryToken(Document)
    );
    profileRepository = module.get<Repository<Profile>>(
      getRepositoryToken(Profile)
    );
    documentService = module.get<DocumentService>(DocumentService);
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    avatarCreatorService =
      module.get<AvatarCreatorService>(AvatarCreatorService);
    urlGeneratorService = module.get<UrlGeneratorService>(UrlGeneratorService);
    fileServiceAdapter = module.get<FileServiceAdapter>(FileServiceAdapter);
    tagsetService = module.get<TagsetService>(TagsetService);
  });

  // ── createStorageBucket ─────────────────────────────────────────

  describe('createStorageBucket', () => {
    it('should create a storage bucket with default allowed MIME types and max file size when no overrides given', () => {
      const result = service.createStorageBucket({});

      expect(result.authorization).toBeDefined();
      expect(result.documents).toEqual([]);
      expect(result.allowedMimeTypes).toEqual(DEFAULT_ALLOWED_MIME_TYPES);
      expect(result.maxFileSize).toBe(15728640);
    });

    it('should use custom allowed MIME types when provided', () => {
      const customTypes = [
        MimeTypeVisual.PNG,
        MimeTypeVisual.JPEG,
      ] as MimeFileType[];

      const result = service.createStorageBucket({
        allowedMimeTypes: customTypes,
      });

      expect(result.allowedMimeTypes).toEqual(customTypes);
    });

    it('should use custom max file size when provided', () => {
      const result = service.createStorageBucket({
        maxFileSize: 5000000,
      });

      expect(result.maxFileSize).toBe(5000000);
    });

    it('should assign storage aggregator when provided in input', () => {
      const mockAggregator = { id: 'agg-1' } as any;

      const result = service.createStorageBucket({
        storageAggregator: mockAggregator,
      });

      expect(result.storageAggregator).toBe(mockAggregator);
    });
  });

  // ── deleteStorageBucket ─────────────────────────────────────────

  describe('deleteStorageBucket', () => {
    it('should delete authorization, all documents, and remove bucket when bucket exists', async () => {
      const doc1 = { id: 'doc-1' };
      const doc2 = { id: 'doc-2' };
      const bucket = {
        id: 'bucket-1',
        authorization: { id: 'auth-1' },
        documents: [doc1, doc2],
      };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.delete as Mock).mockResolvedValue(undefined);
      (documentService.deleteDocument as Mock).mockResolvedValue(undefined);
      (storageBucketRepository.remove as Mock).mockResolvedValue({
        ...bucket,
        id: '',
      });

      const result = await service.deleteStorageBucket('bucket-1');

      expect(authorizationPolicyService.delete).toHaveBeenCalledWith(
        bucket.authorization
      );
      expect(documentService.deleteDocument).toHaveBeenCalledTimes(2);
      expect(documentService.deleteDocument).toHaveBeenCalledWith({
        ID: 'doc-1',
      });
      expect(documentService.deleteDocument).toHaveBeenCalledWith({
        ID: 'doc-2',
      });
      expect(storageBucketRepository.remove).toHaveBeenCalled();
      expect(result.id).toBe('bucket-1');
    });

    it('should skip authorization deletion when bucket has no authorization', async () => {
      const bucket = {
        id: 'bucket-2',
        authorization: undefined,
        documents: [],
      };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (storageBucketRepository.remove as Mock).mockResolvedValue({
        ...bucket,
        id: '',
      });

      await service.deleteStorageBucket('bucket-2');

      expect(authorizationPolicyService.delete).not.toHaveBeenCalled();
    });

    it('should skip document deletion when bucket has no documents', async () => {
      const bucket = {
        id: 'bucket-3',
        authorization: { id: 'auth-3' },
        documents: undefined,
      };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.delete as Mock).mockResolvedValue(undefined);
      (storageBucketRepository.remove as Mock).mockResolvedValue({
        ...bucket,
        id: '',
      });

      await service.deleteStorageBucket('bucket-3');

      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });
  });

  // ── getStorageBucketOrFail ──────────────────────────────────────

  describe('getStorageBucketOrFail', () => {
    it('should return the storage bucket when it exists', async () => {
      const bucket = { id: 'bucket-1' };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getStorageBucketOrFail('bucket-1');

      expect(result).toBe(bucket);
    });

    it('should throw EntityNotFoundException when storageBucketID is empty', async () => {
      await expect(service.getStorageBucketOrFail('')).rejects.toThrow(
        EntityNotFoundException
      );
    });

    it('should propagate error when findOneOrFail rejects', async () => {
      (storageBucketRepository.findOneOrFail as Mock).mockRejectedValue(
        new Error('Not found')
      );

      await expect(
        service.getStorageBucketOrFail('non-existent')
      ).rejects.toThrow();
    });
  });

  // ── uploadFileAsDocumentFromBuffer ──────────────────────────────

  describe('uploadFileAsDocumentFromBuffer', () => {
    it('should upload file via file-service adapter and return the created document when MIME type and size are valid', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-upload' });
      const buffer = Buffer.alloc(1024);
      const createdDoc = mockDocument({
        id: 'doc-created',
        displayName: 'file.png',
        externalID: 'ext-new',
      });

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-created',
        externalID: 'ext-new',
        mimeType: MimeTypeVisual.PNG,
        size: 1024,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(createdDoc);

      const result = await service.uploadFileAsDocumentFromBuffer(
        'bucket-upload',
        buffer,
        'file.png',
        MimeTypeVisual.PNG,
        'user-1'
      );

      expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
        buffer,
        expect.objectContaining({
          displayName: 'file.png',
          storageBucketId: 'bucket-upload',
          authorizationId: 'auth-saved',
          createdBy: 'user-1',
        })
      );
      expect(documentService.getDocumentOrFail).toHaveBeenCalledWith(
        'doc-created',
        {
          relations: {
            authorization: true,
            tagset: { authorization: true },
            storageBucket: true,
          },
        }
      );
      expect(result).toBe(createdDoc);
    });

    it('should throw ValidationException when MIME type is not allowed', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-mime',
        allowedMimeTypes: [MimeTypeVisual.PNG] as MimeFileType[],
      });
      const buffer = Buffer.alloc(100);

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      await expect(
        service.uploadFileAsDocumentFromBuffer(
          'bucket-mime',
          buffer,
          'file.pdf',
          MimeTypeDocument.PDF,
          'user-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when file size exceeds maximum', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-size',
        maxFileSize: 100,
      });
      const buffer = Buffer.alloc(200);

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      await expect(
        service.uploadFileAsDocumentFromBuffer(
          'bucket-size',
          buffer,
          'large.png',
          MimeTypeVisual.PNG,
          'user-1'
        )
      ).rejects.toThrow(ValidationException);
    });

    it('should set temporaryLocation to true when specified', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-temp' });
      const buffer = Buffer.alloc(50);
      const createdDoc = mockDocument();

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-temp',
        externalID: 'ext-temp',
        mimeType: MimeTypeVisual.PNG,
        size: 50,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(createdDoc);

      await service.uploadFileAsDocumentFromBuffer(
        'bucket-temp',
        buffer,
        'temp.png',
        MimeTypeVisual.PNG,
        'user-1',
        true
      );

      expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
        buffer,
        expect.objectContaining({
          temporaryLocation: true,
        })
      );
    });

    it('should roll back auth policy + tagset when the adapter create call throws', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-rb-adapter' });
      const buffer = Buffer.alloc(100);

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({ id: 'tagset-saved' });
      (fileServiceAdapter.createDocument as Mock).mockRejectedValue(
        new Error('adapter failure')
      );

      await expect(
        service.uploadFileAsDocumentFromBuffer(
          'bucket-rb-adapter',
          buffer,
          'file.png',
          MimeTypeVisual.PNG,
          'user-1'
        )
      ).rejects.toThrow('adapter failure');

      // Go service was never called successfully — no Go-side rollback
      expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
      // Pre-created server-owned resources must be cleaned up
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith({
        id: 'auth-saved',
      });
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('tagset-saved');
    });

    it('should roll back Go-side document + auth policy + tagset when the post-upload reload fails', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-rb-reload' });
      const buffer = Buffer.alloc(100);

      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (tagsetService.save as Mock).mockResolvedValue({ id: 'tagset-saved' });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-created',
        externalID: 'ext-new',
        mimeType: MimeTypeVisual.PNG,
        size: 100,
      });
      // Reload after Go created the document fails — compensation must clean up
      // the Go-side document as well as the server-owned resources.
      (documentService.getDocumentOrFail as Mock).mockRejectedValue(
        new Error('reload failed')
      );

      await expect(
        service.uploadFileAsDocumentFromBuffer(
          'bucket-rb-reload',
          buffer,
          'file.png',
          MimeTypeVisual.PNG,
          'user-1'
        )
      ).rejects.toThrow('reload failed');

      expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
        'doc-created'
      );
      expect(authorizationPolicyService.delete).toHaveBeenCalledWith({
        id: 'auth-saved',
      });
      expect(tagsetService.removeTagset).toHaveBeenCalledWith('tagset-saved');
    });
  });

  // ── getFilteredDocuments ────────────────────────────────────────

  describe('getFilteredDocuments', () => {
    const actorContext = new ActorContext();

    beforeEach(() => {
      // Default: grant READ access to all documents
      (authorizationService.isAccessGranted as Mock).mockReturnValue(true);
    });

    it('should return all readable documents when no IDs or limit specified', async () => {
      const doc1 = mockDocument({ id: 'doc-1' });
      const doc2 = mockDocument({ id: 'doc-2' });
      const bucket = mockStorageBucket({
        id: 'bucket-filter',
        documents: [doc1, doc2],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getFilteredDocuments(
        bucket,
        {},
        actorContext
      );

      expect(result).toEqual([doc1, doc2]);
    });

    it('should filter out documents the agent does not have READ access to', async () => {
      const doc1 = mockDocument({ id: 'readable-doc' });
      const doc2 = mockDocument({ id: 'unreadable-doc' });
      const bucket = mockStorageBucket({
        id: 'bucket-auth',
        documents: [doc1, doc2],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationService.isAccessGranted as Mock).mockImplementation(
        (_agent: any, auth: any, _priv: any) => {
          // Only doc1 is readable
          return auth === doc1.authorization;
        }
      );

      const result = await service.getFilteredDocuments(
        bucket,
        {},
        actorContext
      );

      expect(result).toEqual([doc1]);
    });

    it('should return documents in order of requested IDs when IDs filter is specified', async () => {
      const doc1 = mockDocument({ id: 'doc-a' });
      const doc2 = mockDocument({ id: 'doc-b' });
      const doc3 = mockDocument({ id: 'doc-c' });
      const bucket = mockStorageBucket({
        id: 'bucket-ids',
        documents: [doc1, doc2, doc3],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getFilteredDocuments(
        bucket,
        { IDs: ['doc-c', 'doc-a'] },
        actorContext
      );

      expect(result).toEqual([doc3, doc1]);
    });

    it('should throw EntityNotFoundException when requested ID is not in the bucket', async () => {
      const doc1 = mockDocument({ id: 'doc-exists' });
      const bucket = mockStorageBucket({
        id: 'bucket-missing',
        documents: [doc1],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      await expect(
        service.getFilteredDocuments(
          bucket,
          { IDs: ['doc-not-here'] },
          actorContext
        )
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should limit the number of returned documents when limit is specified', async () => {
      const docs = Array.from({ length: 5 }, (_, i) =>
        mockDocument({ id: `doc-${i}` })
      );
      const bucket = mockStorageBucket({
        id: 'bucket-limit',
        documents: docs,
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getFilteredDocuments(
        bucket,
        { limit: 2 },
        actorContext
      );

      expect(result).toHaveLength(2);
    });

    it('should throw EntityNotFoundException when storage has no documents array', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-no-docs',
      });
      // Override documents to undefined to simulate uninitialized state
      (bucket as any).documents = undefined;
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      await expect(
        service.getFilteredDocuments(bucket, {}, actorContext)
      ).rejects.toThrow(EntityNotFoundException);
    });
  });

  // ── addDocumentToStorageBucketOrFail ────────────────────────────

  describe('addDocumentToStorageBucketOrFail', () => {
    it('should add document to bucket and set storageBucket reference when valid', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-add' });
      const doc = mockDocument({ size: 500 });

      const result = await service.addDocumentToStorageBucketOrFail(
        bucket,
        doc
      );

      expect(result.storageBucket).toBe(bucket);
      expect(bucket.documents).toContain(doc);
    });

    it('should not add duplicate document to bucket documents array', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-nodup' });
      const doc = mockDocument({ size: 500 });
      bucket.documents.push(doc);

      await service.addDocumentToStorageBucketOrFail(bucket, doc);

      expect(bucket.documents.filter(d => d === doc)).toHaveLength(1);
    });

    it('should throw ValidationException when document MIME type is not allowed', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-badmime',
        allowedMimeTypes: [MimeTypeVisual.PNG] as MimeFileType[],
      });
      const doc = mockDocument({
        mimeType: MimeTypeDocument.PDF as MimeFileType,
      });

      await expect(
        service.addDocumentToStorageBucketOrFail(bucket, doc)
      ).rejects.toThrow(ValidationException);
    });

    it('should throw ValidationException when document size exceeds bucket max', async () => {
      const bucket = mockStorageBucket({
        id: 'bucket-toobig',
        maxFileSize: 100,
      });
      const doc = mockDocument({ size: 200 });

      await expect(
        service.addDocumentToStorageBucketOrFail(bucket, doc)
      ).rejects.toThrow(ValidationException);
    });
  });

  // ── ensureAvatarUrlIsDocument ───────────────────────────────────

  describe('ensureAvatarUrlIsDocument', () => {
    it('should return existing document when URL is an Alkemio document URL', async () => {
      const existingDoc = mockDocument();
      (documentService.isAlkemioDocumentURL as Mock).mockReturnValue(true);
      (documentService.getDocumentFromURL as Mock).mockResolvedValue(
        existingDoc
      );

      const result = await service.ensureAvatarUrlIsDocument(
        'https://alkem.io/api/private/rest/storage/document/some-id',
        'bucket-1',
        'user-1'
      );

      expect(result).toBe(existingDoc);
      expect(avatarCreatorService.urlToBuffer).not.toHaveBeenCalled();
    });

    it('should throw EntityNotFoundException when Alkemio URL does not resolve to a document', async () => {
      (documentService.isAlkemioDocumentURL as Mock).mockReturnValue(true);
      (documentService.getDocumentFromURL as Mock).mockResolvedValue(undefined);

      await expect(
        service.ensureAvatarUrlIsDocument(
          'https://alkem.io/api/private/rest/storage/document/missing',
          'bucket-1'
        )
      ).rejects.toThrow(EntityNotFoundException);
    });

    it('should download external avatar, detect file type, upload, and return document when URL is external', async () => {
      const imageBuffer = Buffer.from('image-data');
      const uploadedDoc = mockDocument({ externalID: 'ext-avatar' });
      const bucket = mockStorageBucket({ id: 'bucket-avatar' });

      (documentService.isAlkemioDocumentURL as Mock).mockReturnValue(false);
      (avatarCreatorService.urlToBuffer as Mock).mockResolvedValue(imageBuffer);
      (avatarCreatorService.getFileType as Mock).mockResolvedValue(
        MimeTypeVisual.JPEG
      );

      // uploadFileAsDocumentFromBuffer internals (now via fileServiceAdapter)
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-avatar',
        externalID: 'ext-avatar',
        mimeType: MimeTypeVisual.JPEG,
        size: imageBuffer.length,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(
        uploadedDoc
      );

      const result = await service.ensureAvatarUrlIsDocument(
        'https://external.com/avatar.jpg',
        'bucket-avatar',
        'user-1'
      );

      expect(avatarCreatorService.urlToBuffer).toHaveBeenCalledWith(
        'https://external.com/avatar.jpg'
      );
      expect(avatarCreatorService.getFileType).toHaveBeenCalledWith(
        imageBuffer
      );
      expect(result).toBe(uploadedDoc);
    });

    it('should default to PNG MIME type when file type detection returns falsy', async () => {
      const imageBuffer = Buffer.from('unknown-image');
      const uploadedDoc = mockDocument();
      const bucket = mockStorageBucket({ id: 'bucket-fallback' });

      (documentService.isAlkemioDocumentURL as Mock).mockReturnValue(false);
      (avatarCreatorService.urlToBuffer as Mock).mockResolvedValue(imageBuffer);
      (avatarCreatorService.getFileType as Mock).mockResolvedValue(null);

      // uploadFileAsDocumentFromBuffer internals (now via fileServiceAdapter)
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);
      (authorizationPolicyService.save as Mock).mockResolvedValue({
        id: 'auth-saved',
      });
      (fileServiceAdapter.createDocument as Mock).mockResolvedValue({
        id: 'doc-fallback',
        externalID: 'ext-fallback',
        mimeType: MimeTypeVisual.PNG,
        size: imageBuffer.length,
      });
      (documentService.getDocumentOrFail as Mock).mockResolvedValue(
        uploadedDoc
      );

      await service.ensureAvatarUrlIsDocument(
        'https://external.com/unknown',
        'bucket-fallback'
      );

      // The upload should use PNG as the fallback mime type (passed to fileServiceAdapter)
      expect(fileServiceAdapter.createDocument).toHaveBeenCalledWith(
        imageBuffer,
        expect.objectContaining({
          displayName: expect.any(String),
          mimeType: MimeTypeVisual.PNG,
        })
      );
    });
  });

  // ── getStorageBucketParent ──────────────────────────────────────

  describe('getStorageBucketParent', () => {
    it('should return parent profile info when a profile references this bucket', async () => {
      const profile = {
        id: 'profile-1',
        type: 'user',
        displayName: 'John Doe',
      };
      const bucket = mockStorageBucket({ id: 'bucket-parent' });
      (profileRepository.findOne as Mock).mockResolvedValue(profile);
      (urlGeneratorService.generateUrlForProfile as Mock).mockResolvedValue(
        '/users/john-doe'
      );

      const result = await service.getStorageBucketParent(bucket);

      expect(result).toEqual({
        id: 'profile-1',
        type: 'user',
        displayName: 'John Doe',
        url: '/users/john-doe',
      });
    });

    it('should return null when no profile references this bucket', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-orphan' });
      (profileRepository.findOne as Mock).mockResolvedValue(null);

      const result = await service.getStorageBucketParent(bucket);

      expect(result).toBeNull();
    });
  });

  // ── getDocuments ────────────────────────────────────────────────

  describe('getDocuments', () => {
    it('should return documents from storage bucket when they exist', async () => {
      const doc1 = mockDocument({ id: 'doc-g1' });
      const doc2 = mockDocument({ id: 'doc-g2' });
      const bucket = mockStorageBucket({
        id: 'bucket-docs',
        documents: [doc1, doc2],
      });
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(bucket);

      const result = await service.getDocuments(bucket);

      expect(result).toEqual([doc1, doc2]);
    });

    it('should throw EntityNotFoundException when documents are undefined', async () => {
      const bucket = mockStorageBucket({ id: 'bucket-nodocs' });
      const loadedBucket = { ...bucket, documents: undefined };
      (storageBucketRepository.findOneOrFail as Mock).mockResolvedValue(
        loadedBucket
      );

      await expect(service.getDocuments(bucket)).rejects.toThrow(
        EntityNotFoundException
      );
    });
  });
});
