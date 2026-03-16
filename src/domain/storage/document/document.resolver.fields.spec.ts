import { LogContext } from '@common/enums/logging.context';
import { EntityNotFoundException } from '@common/exceptions';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { IDocument } from './document.interface';
import { DocumentResolverFields } from './document.resolver.fields';
import { DocumentService } from './document.service';

describe('DocumentResolverFields', () => {
  let resolver: DocumentResolverFields;
  let userLookupService: UserLookupService;
  let documentService: DocumentService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentResolverFields,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<DocumentResolverFields>(DocumentResolverFields);
    userLookupService = module.get<UserLookupService>(UserLookupService);
    documentService = module.get<DocumentService>(DocumentService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('createdBy', () => {
    it('should return null when document has no createdBy', async () => {
      const document = { id: 'doc-1', createdBy: undefined } as IDocument;

      const result = await resolver.createdBy(document);

      expect(result).toBeNull();
    });

    it('should return user when createdBy resolves to a user', async () => {
      const user = { id: 'user-1', displayName: 'John' };
      const document = { id: 'doc-1', createdBy: 'user-1' } as IDocument;
      (userLookupService.getUserById as Mock).mockResolvedValue(user);

      const result = await resolver.createdBy(document);

      expect(result).toBe(user);
      expect(userLookupService.getUserById).toHaveBeenCalledWith('user-1');
    });

    it('should return null and not throw when createdBy user is not found (EntityNotFoundException)', async () => {
      const document = {
        id: 'doc-2',
        createdBy: 'deleted-user',
      } as IDocument;
      (userLookupService.getUserById as Mock).mockRejectedValue(
        new EntityNotFoundException('User not found', LogContext.AUTH)
      );

      const result = await resolver.createdBy(document);

      expect(result).toBeNull();
    });

    it('should rethrow non-EntityNotFoundException errors', async () => {
      const document = { id: 'doc-3', createdBy: 'user-3' } as IDocument;
      (userLookupService.getUserById as Mock).mockRejectedValue(
        new Error('Database error')
      );

      await expect(resolver.createdBy(document)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('uploadedDate', () => {
    it('should delegate to documentService.getUploadedDate', async () => {
      const date = new Date('2025-06-01T00:00:00Z');
      const document = { id: 'doc-1' } as IDocument;
      (documentService.getUploadedDate as Mock).mockResolvedValue(date);

      const result = await resolver.uploadedDate(document);

      expect(result).toBe(date);
      expect(documentService.getUploadedDate).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('url', () => {
    it('should delegate to documentService.getPubliclyAccessibleURL', async () => {
      const document = { id: 'doc-1' } as IDocument;
      (documentService.getPubliclyAccessibleURL as Mock).mockReturnValue(
        'https://alkem.io/api/private/rest/storage/document/doc-1'
      );

      const result = await resolver.url(document);

      expect(result).toBe(
        'https://alkem.io/api/private/rest/storage/document/doc-1'
      );
      expect(documentService.getPubliclyAccessibleURL).toHaveBeenCalledWith(
        document
      );
    });
  });
});
