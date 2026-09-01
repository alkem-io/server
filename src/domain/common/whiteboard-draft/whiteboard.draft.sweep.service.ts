import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WhiteboardDraftService } from './whiteboard.draft.service';

const SWEEP_BATCH_SIZE = 25;

@Injectable()
export class WhiteboardDraftSweepService {
  constructor(
    private readonly draftService: WhiteboardDraftService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    const whiteboardIDs = await this.draftService.findExpired(SWEEP_BATCH_SIZE);
    for (const whiteboardID of whiteboardIDs) {
      try {
        await this.draftService.cleanupExpired(whiteboardID);
      } catch (error) {
        this.logger.error?.(
          {
            message: 'Whiteboard draft cleanup failed; it remains retryable',
            whiteboardID,
            error: error instanceof Error ? error.message : String(error),
          },
          error instanceof Error ? (error.stack ?? '') : '',
          LogContext.WHITEBOARDS
        );
      }
    }
  }
}
