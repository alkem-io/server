import { ValidationException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { IsNull, Repository } from 'typeorm';
import { type Mock } from 'vitest';
import { SigningAttempt } from './signing.attempt.entity';
import { SigningAttemptService } from './signing.attempt.service';
import { SigningAttemptStatus } from './signing.attempt.status';

describe('SigningAttemptService', () => {
  let service: SigningAttemptService;
  let repository: MockType<Repository<SigningAttempt>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SigningAttemptService,
        repositoryProviderMockFactory(SigningAttempt),
      ],
    }).compile();

    service = module.get(SigningAttemptService);
    repository = module.get(getRepositoryToken(SigningAttempt));
  });

  it('creates an unready pending attempt without document or gateway fields', async () => {
    const created = { id: 'attempt-1' } as SigningAttempt;
    repository.save!.mockResolvedValue(created);

    const result = await service.createUnready('memo-1', 'actor-1');

    expect(repository.save).toHaveBeenCalledWith({
      memoId: 'memo-1',
      actorId: 'actor-1',
      status: SigningAttemptStatus.PENDING,
    });
    expect(result).toBe(created);
  });

  it('finalizes the prepared snapshot once with lowercase hexadecimal SHA-256', async () => {
    repository.update!.mockResolvedValue({ affected: 1 } as any);
    const contentSha256 = 'ab'.repeat(32);

    const finalized = await service.finalizePrepared(
      'attempt-1',
      'snapshot-1',
      contentSha256
    );

    expect(repository.update).toHaveBeenCalledWith(
      {
        id: 'attempt-1',
        status: SigningAttemptStatus.PENDING,
        snapshotDocumentId: IsNull(),
      },
      {
        snapshotDocumentId: 'snapshot-1',
        contentSha256,
      }
    );
    expect(finalized).toBe(true);
  });

  it.each([
    'AB'.repeat(32),
    'ab'.repeat(31),
    `${'ab'.repeat(31)}gg`,
  ])('rejects non-canonical content SHA-256 %s', async contentSha256 => {
    await expect(
      service.finalizePrepared('attempt-1', 'snapshot-1', contentSha256)
    ).rejects.toThrow(ValidationException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('reports a lost conditional finalize without overwriting the attempt', async () => {
    repository.update!.mockResolvedValue({ affected: 0 } as any);

    await expect(
      service.finalizePrepared('attempt-1', 'snapshot-1', 'ab'.repeat(32))
    ).resolves.toBe(false);
  });

  it('deletes every attempt owned by a memo', async () => {
    repository.delete!.mockResolvedValue({ affected: 2 } as any);

    await service.deleteForMemo('memo-1');

    expect(repository.delete).toHaveBeenCalledWith({ memoId: 'memo-1' });
  });

  it('does not query the database for an empty document set', async () => {
    await expect(service.existsForDocumentIDs([])).resolves.toBe(false);
    expect(repository.exist).not.toHaveBeenCalled();
  });

  it('finds attempts that retain either snapshot or signed documents', async () => {
    (repository.exist as Mock).mockResolvedValue(true);

    await expect(
      service.existsForDocumentIDs(['doc-1', 'doc-2'])
    ).resolves.toBe(true);

    expect(repository.exist).toHaveBeenCalledWith({
      where: [
        { snapshotDocumentId: expect.anything() },
        { signedDocumentId: expect.anything() },
      ],
    });
  });
});
