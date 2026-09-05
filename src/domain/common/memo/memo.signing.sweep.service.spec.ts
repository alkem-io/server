import { LogContext } from '@common/enums';
import { MemoSigningSweepService } from './memo.signing.sweep.service';

describe('MemoSigningSweepService', () => {
  const expired = {
    id: 'attempt-1',
    snapshotDocumentId: 'snapshot-1',
  };
  const attemptService = {
    findExpired: vi.fn(),
    expire: vi.fn(),
  };
  const fileServiceAdapter = { deleteDocument: vi.fn() };
  const logger = { error: vi.fn() };
  const service = new MemoSigningSweepService(
    attemptService as any,
    fileServiceAdapter as any,
    logger as any
  );

  beforeEach(() => {
    vi.clearAllMocks();
    attemptService.findExpired.mockResolvedValue([expired]);
    attemptService.expire.mockResolvedValue(true);
    fileServiceAdapter.deleteDocument.mockResolvedValue(undefined);
  });

  it('expires one bounded batch and releases only a winning snapshot', async () => {
    await service.sweep();

    expect(attemptService.findExpired).toHaveBeenCalledWith(25);
    expect(attemptService.expire).toHaveBeenCalledWith(expired);
    expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledWith(
      'snapshot-1'
    );

    attemptService.expire.mockResolvedValue(false);
    await service.sweep();
    expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledTimes(1);
  });

  it('continues the batch and logs no raw cleanup cause', async () => {
    attemptService.findExpired.mockResolvedValue([
      expired,
      { id: 'attempt-2', snapshotDocumentId: 'snapshot-2' },
    ]);
    attemptService.expire.mockResolvedValue(true);
    fileServiceAdapter.deleteDocument
      .mockRejectedValueOnce(new Error('secret file response'))
      .mockResolvedValueOnce(undefined);

    await service.sweep();

    expect(fileServiceAdapter.deleteDocument).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      {
        message: 'Expired memo signing snapshot cleanup failed',
        attemptId: 'attempt-1',
        documentId: 'snapshot-1',
      },
      undefined,
      LogContext.MEMOS
    );
  });

  it('expires an unprepared row without attempting file cleanup', async () => {
    const unprepared = { id: 'attempt-unprepared', snapshotDocumentId: null };
    attemptService.findExpired.mockResolvedValue([unprepared]);

    await service.sweep();

    expect(attemptService.expire).toHaveBeenCalledWith(unprepared);
    expect(fileServiceAdapter.deleteDocument).not.toHaveBeenCalled();
  });
});
