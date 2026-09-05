import { ForbiddenException, ValidationException } from '@common/exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType } from '@test/utils/mock.type';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
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

  it('claims one pending attempt before gateway start', async () => {
    repository.update!.mockResolvedValue({ affected: 1 } as any);
    const clientStateHash = 'cd'.repeat(32);

    await expect(
      service.claimStart('attempt-1', clientStateHash)
    ).resolves.toBe(true);
    expect(repository.update).toHaveBeenCalledWith(
      {
        id: 'attempt-1',
        status: SigningAttemptStatus.PENDING,
        clientStateHash: IsNull(),
      },
      { clientStateHash }
    );
  });

  it('loses a concurrent start claim and rejects a non-canonical state hash', async () => {
    repository.update!.mockResolvedValue({ affected: 0 } as any);

    await expect(
      service.claimStart('attempt-1', 'cd'.repeat(32))
    ).resolves.toBe(false);
    await expect(
      service.claimStart('attempt-1', 'CD'.repeat(32))
    ).rejects.toThrow(ValidationException);
  });

  it('persists gateway correlation and authoritative expiry only for its claim', async () => {
    repository.update!.mockResolvedValue({ affected: 1 } as any);
    const expiresAt = new Date('2026-09-05T16:30:00Z');

    await expect(
      service.recordGatewayStart(
        'attempt-1',
        'cd'.repeat(32),
        'correlation-1',
        expiresAt
      )
    ).resolves.toBe(true);
    expect(repository.update).toHaveBeenCalledWith(
      {
        id: 'attempt-1',
        status: SigningAttemptStatus.PENDING,
        clientStateHash: 'cd'.repeat(32),
        correlationId: IsNull(),
        expiresAt: IsNull(),
      },
      { correlationId: 'correlation-1', expiresAt }
    );
  });

  it('deletes every attempt owned by a memo', async () => {
    repository.delete!.mockResolvedValue({ affected: 2 } as any);

    await service.deleteForMemo('memo-1');

    expect(repository.delete).toHaveBeenCalledWith({ memoId: 'memo-1' });
  });

  it('loads an attempt only for its initiating actor', async () => {
    const attempt = { id: 'attempt-1' } as SigningAttempt;
    repository.findOneBy!.mockResolvedValue(attempt);

    await expect(
      service.getForActorOrFail('attempt-1', 'actor-1')
    ).resolves.toBe(attempt);
    expect(repository.findOneBy).toHaveBeenCalledWith({
      id: 'attempt-1',
      actorId: 'actor-1',
    });
  });

  it('fails closed when an attempt is not owned by the actor', async () => {
    repository.findOneBy!.mockResolvedValue(null);

    await expect(
      service.getForActorOrFail('attempt-1', 'other-actor')
    ).rejects.toThrow(ValidationException);
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

  it('matches a browser return by initiating actor and client-state hash before checking correlation', async () => {
    const attempt = {
      id: 'attempt-1',
      correlationId: 'correlation-1',
    } as SigningAttempt;
    repository.findOneBy!.mockResolvedValue(attempt);

    await expect(
      service.getForReturnOrFail('correlation-1', 'actor-1', 'ef'.repeat(32))
    ).resolves.toBe(attempt);
    expect(repository.findOneBy).toHaveBeenCalledWith({
      actorId: 'actor-1',
      clientStateHash: 'ef'.repeat(32),
    });
  });

  it('returns a claimed attempt whose gateway correlation was never persisted', async () => {
    const attempt = {
      id: 'attempt-1',
      correlationId: null,
    } as unknown as SigningAttempt;
    repository.findOneBy!.mockResolvedValue(attempt);

    await expect(
      service.getForReturnOrFail('correlation-1', 'actor-1', 'ef'.repeat(32))
    ).resolves.toBe(attempt);
  });

  it('fails closed for a wrong actor, state or correlation', async () => {
    repository.findOneBy!.mockResolvedValue({
      id: 'attempt-1',
      correlationId: 'other-correlation',
    } as SigningAttempt);

    await expect(
      service.getForReturnOrFail(
        'wrong-correlation',
        'other-actor',
        'ef'.repeat(32)
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it('conditionally attaches one signed document and releases the snapshot FK', async () => {
    repository.update!.mockResolvedValue({ affected: 1 } as any);
    const evidence = { signer: { serial_number: 'ABC' } };

    await expect(
      service.finish(
        'attempt-1',
        SigningAttemptStatus.SIGNED,
        'signed-document-1',
        evidence
      )
    ).resolves.toBe(true);
    expect(repository.update).toHaveBeenCalledWith(
      { id: 'attempt-1', status: SigningAttemptStatus.PENDING },
      {
        status: SigningAttemptStatus.SIGNED,
        snapshotDocumentId: null,
        signedDocumentId: 'signed-document-1',
        signerEvidence: evidence,
      }
    );
  });

  it.each<Exclude<SigningAttemptStatus, SigningAttemptStatus.PENDING>>([
    SigningAttemptStatus.CANCELLED,
    SigningAttemptStatus.FAILED,
    SigningAttemptStatus.EXPIRED,
  ])('conditionally records %s without a signed document', async status => {
    repository.update!.mockResolvedValue({ affected: 0 } as any);

    await expect(service.finish('attempt-1', status)).resolves.toBe(false);
    expect(repository.update).toHaveBeenCalledWith(
      { id: 'attempt-1', status: SigningAttemptStatus.PENDING },
      { status, snapshotDocumentId: null }
    );
  });

  it('lists only signed copies for one memo in completion order', async () => {
    repository.find!.mockResolvedValue([]);

    await service.findSignedForMemo('memo-1');

    expect(repository.find).toHaveBeenCalledWith({
      where: { memoId: 'memo-1', status: SigningAttemptStatus.SIGNED },
      order: { updatedDate: 'DESC' },
    });
  });

  it('selects a bounded union of gateway-expired and abandoned prepared attempts', async () => {
    repository.find!.mockResolvedValue([]);
    const now = new Date('2026-09-05T18:00:00Z');

    await service.findExpired(25, now);

    expect(repository.find).toHaveBeenCalledWith({
      where: [
        {
          status: SigningAttemptStatus.PENDING,
          expiresAt: LessThanOrEqual(new Date('2026-09-05T17:59:00Z')),
        },
        {
          status: SigningAttemptStatus.PENDING,
          expiresAt: IsNull(),
          createdDate: LessThanOrEqual(new Date('2026-09-05T17:00:00Z')),
        },
      ],
      order: { createdDate: 'ASC' },
      take: 25,
    });
  });

  it.each([
    [
      'gateway deadline',
      { id: 'attempt-1', expiresAt: new Date('2026-09-05T17:58:00Z') },
      {
        id: 'attempt-1',
        status: SigningAttemptStatus.PENDING,
        expiresAt: LessThanOrEqual(new Date('2026-09-05T17:59:00Z')),
      },
    ],
    [
      'preparation window',
      { id: 'attempt-1', createdDate: new Date('2026-09-05T16:00:00Z') },
      {
        id: 'attempt-1',
        status: SigningAttemptStatus.PENDING,
        expiresAt: IsNull(),
        createdDate: LessThanOrEqual(new Date('2026-09-05T17:00:00Z')),
      },
    ],
  ])('repeats the %s predicate when expiring a candidate', async (_name, attempt, where) => {
    repository.update!.mockResolvedValue({ affected: 1 } as any);

    await expect(
      service.expire(
        attempt as SigningAttempt,
        new Date('2026-09-05T18:00:00Z')
      )
    ).resolves.toBe(true);
    expect(repository.update).toHaveBeenCalledWith(where, {
      status: SigningAttemptStatus.EXPIRED,
      snapshotDocumentId: null,
    });
  });
});
