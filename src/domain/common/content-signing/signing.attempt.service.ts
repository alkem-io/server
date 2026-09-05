import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { SigningAttempt } from './signing.attempt.entity';
import { SigningAttemptStatus } from './signing.attempt.status';

const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/;

@Injectable()
export class SigningAttemptService {
  static readonly PREPARATION_WINDOW_MS = 60 * 60 * 1000;

  constructor(
    @InjectRepository(SigningAttempt)
    private readonly repository: Repository<SigningAttempt>
  ) {}

  async createUnready(
    memoId: string,
    actorId: string
  ): Promise<SigningAttempt> {
    return this.repository.save({
      memoId,
      actorId,
      status: SigningAttemptStatus.PENDING,
    });
  }

  async finalizePrepared(
    attemptId: string,
    snapshotDocumentId: string,
    contentSha256: string
  ): Promise<boolean> {
    this.validateHash(contentSha256, 'Content SHA-256');
    const result = await this.repository.update(
      {
        id: attemptId,
        status: SigningAttemptStatus.PENDING,
        snapshotDocumentId: IsNull(),
      },
      { snapshotDocumentId, contentSha256 }
    );
    return result.affected === 1;
  }

  async claimStart(
    attemptId: string,
    actorId: string,
    clientStateHash: string,
    now = new Date()
  ): Promise<boolean> {
    this.validateHash(clientStateHash, 'Client-state hash');
    const result = await this.repository.update(
      {
        id: attemptId,
        actorId,
        status: SigningAttemptStatus.PENDING,
        snapshotDocumentId: Not(IsNull()),
        contentSha256: Not(IsNull()),
        clientStateHash: IsNull(),
        correlationId: IsNull(),
        expiresAt: IsNull(),
        createdDate: MoreThan(
          new Date(now.getTime() - SigningAttemptService.PREPARATION_WINDOW_MS)
        ),
      },
      { clientStateHash }
    );
    return result.affected === 1;
  }

  async recordGatewayStart(
    attemptId: string,
    clientStateHash: string,
    correlationId: string,
    expiresAt: Date
  ): Promise<boolean> {
    this.validateHash(clientStateHash, 'Client-state hash');
    const result = await this.repository.update(
      {
        id: attemptId,
        status: SigningAttemptStatus.PENDING,
        clientStateHash,
        correlationId: IsNull(),
        expiresAt: IsNull(),
      },
      { correlationId, expiresAt }
    );
    return result.affected === 1;
  }

  async deleteForMemo(memoId: string): Promise<void> {
    await this.repository.delete({ memoId });
  }

  async getForActorOrFail(
    attemptId: string,
    actorId: string
  ): Promise<SigningAttempt> {
    const attempt = await this.repository.findOneBy({ id: attemptId, actorId });
    if (!attempt)
      throw new ValidationException(
        'Signing attempt is not available for this actor',
        LogContext.MEMOS
      );
    return attempt;
  }

  async existsForDocumentIDs(documentIds: string[]): Promise<boolean> {
    if (documentIds.length === 0) return false;
    return this.repository.exist({
      where: [
        { snapshotDocumentId: In(documentIds) },
        { signedDocumentId: In(documentIds) },
      ],
    });
  }

  private validateHash(value: string, label: string): void {
    if (!LOWERCASE_SHA256.test(value))
      throw new ValidationException(
        `${label} must be 64 lowercase hexadecimal characters`,
        LogContext.MEMOS
      );
  }
}
