import { LogContext } from '@common/enums';
import { ValidationException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { SigningAttempt } from './signing.attempt.entity';
import { SigningAttemptStatus } from './signing.attempt.status';

const LOWERCASE_SHA256 = /^[0-9a-f]{64}$/;

@Injectable()
export class SigningAttemptService {
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
    if (!LOWERCASE_SHA256.test(contentSha256)) {
      throw new ValidationException(
        'Content SHA-256 must be 64 lowercase hexadecimal characters',
        LogContext.MEMOS
      );
    }
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
}
