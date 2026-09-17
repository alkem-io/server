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
  const memoSigningService = { releaseExpiredAttemptFiles: vi.fn() };
  const service = new MemoSigningSweepService(
    attemptService as any,
    memoSigningService as any
  );

  beforeEach(() => {
    vi.clearAllMocks();
    attemptService.findExpired.mockResolvedValue([expired]);
    attemptService.expire.mockResolvedValue(true);
    memoSigningService.releaseExpiredAttemptFiles.mockResolvedValue(undefined);
  });

  it('expires one bounded batch and releases only a winning snapshot', async () => {
    await service.sweep();

    expect(attemptService.findExpired).toHaveBeenCalledWith(25);
    expect(attemptService.expire).toHaveBeenCalledWith(expired);
    expect(memoSigningService.releaseExpiredAttemptFiles).toHaveBeenCalledWith(
      expired
    );

    attemptService.expire.mockResolvedValue(false);
    await service.sweep();
    expect(memoSigningService.releaseExpiredAttemptFiles).toHaveBeenCalledTimes(
      1
    );
  });

  it('continues the batch when an expired attempt release fails', async () => {
    attemptService.findExpired.mockResolvedValue([
      expired,
      { id: 'attempt-2', snapshotDocumentId: 'snapshot-2' },
    ]);
    attemptService.expire.mockResolvedValue(true);
    memoSigningService.releaseExpiredAttemptFiles.mockRejectedValueOnce(
      new Error('cleanup failed')
    );
    await service.sweep();

    expect(memoSigningService.releaseExpiredAttemptFiles).toHaveBeenCalledTimes(
      2
    );
  });
});
