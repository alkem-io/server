import { SigningAttemptService } from '@domain/common/content-signing/signing.attempt.service';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MemoSigningService } from './memo.signing.service';

const SWEEP_BATCH_SIZE = 25;

@Injectable()
export class MemoSigningSweepService {
  constructor(
    private readonly attemptService: SigningAttemptService,
    private readonly memoSigningService: MemoSigningService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    for (const attempt of await this.attemptService.findExpired(
      SWEEP_BATCH_SIZE
    )) {
      if (!(await this.attemptService.expire(attempt))) continue;
      await this.memoSigningService
        .releaseExpiredAttemptFiles(attempt)
        .catch(() => undefined);
    }
  }
}
