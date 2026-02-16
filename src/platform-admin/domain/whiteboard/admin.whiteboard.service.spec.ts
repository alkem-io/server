import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { DocumentService } from '@domain/storage/document/document.service';
import { DocumentAuthorizationService } from '@domain/storage/document/document.service.authorization';
import { StorageBucketService } from '@domain/storage/storage-bucket/storage.bucket.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock, vi } from 'vitest';
import { AdminWhiteboardService } from './admin.whiteboard.service';

// Mock the base64ToBuffer utility
vi.mock('@common/utils', async importOriginal => {
  const original = await importOriginal<typeof import('@common/utils')>();
  return {
    ...original,
    base64ToBuffer: vi.fn(),
  };
});

import { base64ToBuffer } from '@common/utils';

describe('AdminWhiteboardService', () => {
  let service: AdminWhiteboardService;
  let mockEntityManager: { find: Mock; save: Mock };
  let storageBucketService: { uploadFileAsDocumentFromBuffer: Mock };
  let documentService: { saveDocument: Mock; getPubliclyAccessibleURL: Mock };
  let documentAuthorizationService: { applyAuthorizationPolicy: Mock };
  let authorizationPolicyService: { saveAll: Mock };

  const agentInfo = { userID: 'uploader-1' } as any;

  beforeEach(async () => {
    mockEntityManager = {
      find: vi.fn(),
      save: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminWhiteboardService,
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(AdminWhiteboardService);
    storageBucketService = module.get(
      StorageBucketService
    ) as unknown as typeof storageBucketService;
    documentService = module.get(
      DocumentService
    ) as unknown as typeof documentService;
    documentAuthorizationService = module.get(
      DocumentAuthorizationService
    ) as unknown as typeof documentAuthorizationService;
    authorizationPolicyService = module.get(
      AuthorizationPolicyService
    ) as unknown as typeof authorizationPolicyService;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeWhiteboard = (
    id: string,
    content: string | null,
    storageBucket: any = { id: 'sb-1', authorization: {} }
  ) => ({
    id,
    content,
    constructor: { name: 'Whiteboard' },
    profile: {
      id: 'profile-1',
      displayName: 'WB',
      storageBucket,
    },
  });

  describe('uploadFilesFromContentToStorageBucket', () => {
    it('should skip whiteboards with no content', async () => {
      const wb = makeWhiteboard('wb-1', null);
      mockEntityManager.find.mockResolvedValue([wb]);
      mockEntityManager.save.mockResolvedValue(undefined);

      const result =
        await service.uploadFilesFromContentToStorageBucket(agentInfo);

      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).not.toHaveBeenCalled();
      expect(result.results).toContain('1 Whiteboards processed');
    });

    it('should add error when storageBucket is missing', async () => {
      const wb = makeWhiteboard('wb-1', '{}', undefined);
      wb.profile.storageBucket = undefined;
      mockEntityManager.find.mockResolvedValue([wb]);
      mockEntityManager.save.mockResolvedValue(undefined);

      const result =
        await service.uploadFilesFromContentToStorageBucket(agentInfo);

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('StorageBucket not found'),
        ])
      );
    });

    it('should add warning when content has no files attribute', async () => {
      const wb = makeWhiteboard('wb-1', JSON.stringify({ type: 'excalidraw' }));
      mockEntityManager.find.mockResolvedValue([wb]);
      mockEntityManager.save.mockResolvedValue(undefined);

      const result =
        await service.uploadFilesFromContentToStorageBucket(agentInfo);

      expect(result.warns).toEqual(
        expect.arrayContaining([
          expect.stringContaining('no files attribute found'),
        ])
      );
    });

    it('should add warning when a file has no dataURL', async () => {
      const content = {
        files: {
          'file-1': { mimeType: 'image/png', id: 'file-1', dataURL: '' },
        },
      };
      const wb = makeWhiteboard('wb-1', JSON.stringify(content));
      mockEntityManager.find.mockResolvedValue([wb]);
      mockEntityManager.save.mockResolvedValue(undefined);

      const result =
        await service.uploadFilesFromContentToStorageBucket(agentInfo);

      expect(result.warns).toEqual(
        expect.arrayContaining([
          expect.stringContaining("doesn't have any content"),
        ])
      );
    });

    it('should add error when base64ToBuffer returns undefined', async () => {
      const content = {
        files: {
          'file-1': {
            mimeType: 'image/png',
            id: 'file-1',
            dataURL: 'invalid-base64',
          },
        },
      };
      const wb = makeWhiteboard('wb-1', JSON.stringify(content));
      mockEntityManager.find.mockResolvedValue([wb]);
      mockEntityManager.save.mockResolvedValue(undefined);
      vi.mocked(base64ToBuffer).mockReturnValue(undefined);

      const result =
        await service.uploadFilesFromContentToStorageBucket(agentInfo);

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('unable to decode base64'),
        ])
      );
    });

    it('should upload file and set url on success', async () => {
      const content = {
        files: {
          'file-1': {
            mimeType: 'image/png',
            id: 'file-1',
            dataURL: 'data:image/png;base64,abc',
          },
        },
      };
      const wb = makeWhiteboard('wb-1', JSON.stringify(content));
      mockEntityManager.find.mockResolvedValue([wb]);
      mockEntityManager.save.mockResolvedValue(undefined);

      const buffer = Buffer.from('abc');
      vi.mocked(base64ToBuffer).mockReturnValue(buffer);

      const doc = { id: 'doc-1' };
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockResolvedValue(doc);
      vi.mocked(documentService.saveDocument).mockResolvedValue(doc);
      vi.mocked(
        documentAuthorizationService.applyAuthorizationPolicy
      ).mockResolvedValue([]);
      vi.mocked(authorizationPolicyService.saveAll).mockResolvedValue(
        undefined
      );
      vi.mocked(documentService.getPubliclyAccessibleURL).mockReturnValue(
        'https://cdn.example.com/doc-1'
      );

      const result =
        await service.uploadFilesFromContentToStorageBucket(agentInfo);

      expect(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).toHaveBeenCalledWith(
        'sb-1',
        buffer,
        expect.stringContaining('Whiteboard'),
        'image/png',
        'uploader-1'
      );
      expect(result.results).toEqual(
        expect.arrayContaining([expect.stringContaining('1 files processed')])
      );
      // Verify the dataURL was cleared and url set
      const updatedContent = JSON.parse(wb.content!);
      expect(updatedContent.files['file-1'].url).toBe(
        'https://cdn.example.com/doc-1'
      );
      expect(updatedContent.files['file-1'].dataURL).toBe('');
    });

    it('should add error when upload throws and continue processing', async () => {
      const content = {
        files: {
          'file-1': {
            mimeType: 'image/png',
            id: 'file-1',
            dataURL: 'data:image/png;base64,abc',
          },
        },
      };
      const wb = makeWhiteboard('wb-1', JSON.stringify(content));
      mockEntityManager.find.mockResolvedValue([wb]);
      mockEntityManager.save.mockResolvedValue(undefined);

      const buffer = Buffer.from('abc');
      vi.mocked(base64ToBuffer).mockReturnValue(buffer);
      vi.mocked(
        storageBucketService.uploadFileAsDocumentFromBuffer
      ).mockRejectedValue(new Error('upload failed'));

      const result =
        await service.uploadFilesFromContentToStorageBucket(agentInfo);

      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringContaining('upload failed')])
      );
    });
  });
});
