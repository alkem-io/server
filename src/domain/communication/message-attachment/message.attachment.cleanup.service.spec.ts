import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { Document } from '@domain/storage/document/document.entity';
import { DocumentService } from '@domain/storage/document/document.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked } from 'vitest';
import { MessageAttachmentCleanupService } from './message.attachment.cleanup.service';

const MATRIX_MEDIA_BUCKET = 'matrix-media-bucket';

const mockConfig = {
  get: vi.fn((key: string) => {
    if (key === 'communications.message_attachments.enabled') return true;
    if (key === 'storage.file_service.matrix_media_bucket_id')
      return MATRIX_MEDIA_BUCKET;
    return undefined;
  }),
};

describe('MessageAttachmentCleanupService', () => {
  let service: MessageAttachmentCleanupService;
  let documentService: Mocked<DocumentService>;
  let documentRepository: { find: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.restoreAllMocks();
    documentRepository = { find: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageAttachmentCleanupService,
        MockWinstonProvider,
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: getRepositoryToken(Document),
          useValue: documentRepository,
        },
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

  it('does nothing when the feature flag is off', async () => {
    const disabledConfig = {
      get: vi.fn((key: string) => {
        if (key === 'communications.message_attachments.enabled') return false;
        return MATRIX_MEDIA_BUCKET;
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageAttachmentCleanupService,
        MockWinstonProvider,
        { provide: ConfigService, useValue: disabledConfig },
        {
          provide: getRepositoryToken(Document),
          useValue: documentRepository,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();
    const disabled = module.get(MessageAttachmentCleanupService);

    await disabled.sweepStagingDocuments();

    expect(documentRepository.find).not.toHaveBeenCalled();
  });
});
