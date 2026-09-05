import { LogContext } from '@common/enums';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { SigningAttempt } from './signing.attempt.entity';
import { SigningAttemptStatus } from './signing.attempt.status';

const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/;

@Injectable()
export class SigningAttemptService {
  static readonly PREPARATION_WINDOW_MS = 60 * 60 * 1000;
  private static readonly GATEWAY_EXPIRY_MARGIN_MS = 60 * 1000;

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

  async claimStart(id: string, clientStateHash: string): Promise<boolean> {
    this.validateHash(clientStateHash, 'Client-state hash');
    const result = await this.repository.update(
      {
        id,
        status: SigningAttemptStatus.PENDING,
        clientStateHash: IsNull(),
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

  async getForReturnOrFail(
    correlationId: string,
    actorId: string,
    clientStateHash: string
  ): Promise<SigningAttempt> {
    const attempt = await this.repository.findOneBy({
      actorId,
      clientStateHash,
    });
    if (
      !attempt ||
      (attempt.correlationId && attempt.correlationId !== correlationId)
    )
      throw new ForbiddenException(
        'Signing return does not match this actor',
        LogContext.MEMOS
      );
    return attempt;
  }

  async finish(
    id: string,
    status: Exclude<SigningAttemptStatus, SigningAttemptStatus.PENDING>,
    signedDocumentId?: string,
    signerEvidence?: Record<string, unknown>
  ): Promise<boolean> {
    const completed = status === SigningAttemptStatus.SIGNED;
    const result = await this.repository.update(
      { id, status: SigningAttemptStatus.PENDING },
      {
        status,
        snapshotDocumentId: null,
        ...(completed ? { signedDocumentId, signerEvidence } : {}),
      }
    );
    return result.affected === 1;
  }

  findSignedForMemo(memoId: string): Promise<SigningAttempt[]> {
    return this.repository.find({
      where: { memoId, status: SigningAttemptStatus.SIGNED },
      order: { updatedDate: 'DESC' },
    });
  }

  findExpired(limit: number, now = new Date()): Promise<SigningAttempt[]> {
    return this.repository.find({
      where: [
        {
          status: SigningAttemptStatus.PENDING,
          ...this.deadline(now, true),
        },
        {
          status: SigningAttemptStatus.PENDING,
          ...this.deadline(now, false),
        },
      ],
      order: { createdDate: 'ASC' },
      take: limit,
    });
  }

  async expire(attempt: SigningAttempt, now = new Date()): Promise<boolean> {
    const where = {
      id: attempt.id,
      status: SigningAttemptStatus.PENDING,
      ...this.deadline(now, Boolean(attempt.expiresAt)),
    };
    const result = await this.repository.update(where, {
      status: SigningAttemptStatus.EXPIRED,
      snapshotDocumentId: null,
    });
    return result.affected === 1;
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

  private deadline(now: Date, gatewayStarted: boolean) {
    const age = gatewayStarted
      ? SigningAttemptService.GATEWAY_EXPIRY_MARGIN_MS
      : SigningAttemptService.PREPARATION_WINDOW_MS;
    const cutoff = LessThanOrEqual(new Date(now.getTime() - age));
    return gatewayStarted
      ? { expiresAt: cutoff }
      : { expiresAt: IsNull(), createdDate: cutoff };
  }

  private validateHash(value: string, label: string): void {
    if (!LOWERCASE_SHA256.test(value))
      throw new ValidationException(
        `${label} must be 64 lowercase hexadecimal characters`,
        LogContext.MEMOS
      );
  }
}
