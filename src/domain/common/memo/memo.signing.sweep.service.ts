import { LogContext } from '@common/enums';
import { SigningAttemptService } from '@domain/common/content-signing/signing.attempt.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FileServiceAdapter } from '@services/adapters/file-service-adapter/file.service.adapter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

const SWEEP_BATCH_SIZE = 25;

@Injectable()
export class MemoSigningSweepService {
  constructor(
    private readonly attemptService: SigningAttemptService,
    private readonly fileServiceAdapter: FileServiceAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    for (const attempt of await this.attemptService.findExpired(
      SWEEP_BATCH_SIZE
    )) {
      if (!(await this.attemptService.expire(attempt))) continue;
      if (!attempt.snapshotDocumentId) continue;
      await this.fileServiceAdapter
        .deleteDocument(attempt.snapshotDocumentId)
        .catch(() =>
          this.logger.error?.(
            {
              message: 'Expired memo signing snapshot cleanup failed',
              attemptId: attempt.id,
              documentId: attempt.snapshotDocumentId,
            },
            undefined,
            LogContext.MEMOS
          )
        );
    }
  }
}
