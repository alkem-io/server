import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { Document } from '@domain/storage/document/document.entity';
import { DocumentService } from '@domain/storage/document/document.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { MessageAttachmentCleanupService } from './message.attachment.cleanup.service';

const MATRIX_MEDIA_BUCKET = 'matrix-media-bucket';

describe('MessageAttachmentCleanupService', () => {
  let service: MessageAttachmentCleanupService;
  let documentService: Mocked<DocumentService>;
  let documentRepository: { find: ReturnType<typeof vi.fn> };
  let redis: { set: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.restoreAllMocks();
    documentRepository = { find: vi.fn() };
    // Claim won by default — `SET NX` returns 'OK' for the owning replica.
    redis = { set: vi.fn().mockResolvedValue('OK') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageAttachmentCleanupService,
        MockWinstonProvider,
        {
          provide: getRepositoryToken(Document),
          useValue: documentRepository,
        },
        { provide: MESSAGING_REDIS_CLIENT, useValue: redis },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(MessageAttachmentCleanupService);
    documentService = module.get(DocumentService);
  });

  it('reaps unsent temporaryLocation conversation uploads only — never matrix_media staging rows (H2/H3)', async () => {
    documentRepository.find.mockResolvedValue([{ id: 'unsent-upload' }]);

    await service.sweepStagingDocuments();

    // Exactly one query, scoped to unsent CONVERSATION uploads — not staging.
    expect(documentRepository.find).toHaveBeenCalledTimes(1);
    const where = documentRepository.find.mock.calls[0][0].where;
    expect(where.temporaryLocation).toBe(true);
    expect(where.storageBucket.storageAggregator.type).toBe(
      StorageAggregatorType.CONVERSATION
    );

    // No query ever targets the matrix_media staging bucket by id.
    const serialized = JSON.stringify(documentRepository.find.mock.calls);
    expect(serialized).not.toContain(MATRIX_MEDIA_BUCKET);

    // Only the unsent upload is released — via the canonical DocumentService
    // delete path (FIX 5) so the auth-policy + tagset rows are cleaned up too.
    expect(documentService.deleteDocument).toHaveBeenCalledTimes(1);
    expect(documentService.deleteDocument).toHaveBeenCalledWith({
      ID: 'unsent-upload',
    });
  });

  it('runs unconditionally — the cross-replica claim is the ONLY gate ahead of the sweep', async () => {
    // There is no enable/disable config: a scheduled tick goes straight to the
    // claim and, once won, straight to the query.
    documentRepository.find.mockResolvedValue([]);

    await service.sweepStagingDocuments();

    expect(redis.set).toHaveBeenCalledTimes(1);
    expect(documentRepository.find).toHaveBeenCalledTimes(1);
  });

  describe('cross-replica claim', () => {
    it('claims the run atomically (SET NX + TTL) before touching anything', async () => {
      documentRepository.find.mockResolvedValue([]);

      await service.sweepStagingDocuments();

      expect(redis.set).toHaveBeenCalledTimes(1);
      const [key, , exFlag, ttlSeconds, nxFlag] = redis.set.mock.calls[0];
      expect(key).toBe('msg:attachment:cleanup:claim');
      expect(exFlag).toBe('EX');
      expect(ttlSeconds).toBeGreaterThan(0);
      expect(nxFlag).toBe('NX');
    });

    it('a replica that LOSES the claim reaps nothing (no duplicate 404/EntityNotFound burst)', async () => {
      // `SET NX` returns null when the key already exists — another replica owns
      // this run.
      redis.set.mockResolvedValue(null);

      await service.sweepStagingDocuments();

      expect(documentRepository.find).not.toHaveBeenCalled();
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });

    it('fails CLOSED: an unreachable Redis skips the run rather than letting every replica sweep', async () => {
      redis.set.mockRejectedValue(new Error('redis down'));

      await expect(service.sweepStagingDocuments()).resolves.toBeUndefined();

      expect(documentRepository.find).not.toHaveBeenCalled();
      expect(documentService.deleteDocument).not.toHaveBeenCalled();
    });
  });
});
