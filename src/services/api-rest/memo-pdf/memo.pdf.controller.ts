import { CurrentActor } from '@common/decorators';
import { AlkemioErrorStatus } from '@common/enums/alkemio.error.status';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import {
  EntityNotFoundException,
  ForbiddenAuthorizationPolicyException,
  ForbiddenException,
  ValidationException,
} from '@common/exceptions';
import { MemoPdfUnavailableException } from '@common/exceptions/memo.pdf.unavailable.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { RestGuard } from '@core/authorization/rest.guard';
import { MemoPdfDownloadService } from '@domain/common/memo/memo.pdf.download.service';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';

const RETRY_AFTER_SECONDS = '5';

@Controller('rest/memo')
export class MemoPdfController {
  constructor(private readonly downloads: MemoPdfDownloadService) {}

  /**
   * The memo's current content as a PDF attachment. The whole PDF is rendered
   * before any header is written, so a failed render can never produce a
   * truncated 200. A client that disconnects first cancels the render.
   */
  @Get(RestEndpoint.MEMO_PDF)
  @UseGuards(RestGuard)
  async download(
    @Param('memoId', ParseUUIDPipe) memoId: string,
    @CurrentActor() actor: ActorContext,
    @Res() response: Response
  ): Promise<Response | void> {
    if (!actor?.actorID) return response.sendStatus(401);
    const abort = new AbortController();
    response.on('close', () => {
      if (!response.writableFinished) abort.abort();
    });
    try {
      const { pdf, filename } = await this.downloads.download(
        memoId,
        actor,
        abort.signal
      );
      if (abort.signal.aborted) return;
      response.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      return response.send(pdf);
    } catch (error) {
      if (abort.signal.aborted) return;
      return this.sendKnownError(error, response);
    }
  }

  private sendKnownError(error: unknown, response: Response): Response {
    if (error instanceof EntityNotFoundException)
      return response.sendStatus(404);
    if (
      error instanceof ForbiddenException ||
      error instanceof ForbiddenAuthorizationPolicyException ||
      (error as { code?: string })?.code === AlkemioErrorStatus.FORBIDDEN_POLICY
    )
      return response.sendStatus(403);
    if (error instanceof ValidationException)
      return response.status(422).json({ message: error.message });
    if (error instanceof MemoPdfUnavailableException)
      return response
        .set(
          'Retry-After',
          error.retryAfterSeconds?.toString() ?? RETRY_AFTER_SECONDS
        )
        .sendStatus(
          error.reason === 'busy-actor' || error.reason === 'rate-limited'
            ? 429
            : 503
        );
    throw error;
  }
}
