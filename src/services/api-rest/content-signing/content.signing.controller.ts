import { CurrentActor } from '@common/decorators';
import { LogContext } from '@common/enums';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { UnauthenticatedHttpException } from '@common/exceptions/http';
import { ActorContext } from '@core/actor-context/actor.context';
import { RestGuard } from '@core/authorization/rest.guard';
import { MemoSigningService } from '@domain/common/memo/memo.signing.service';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ContentSigningReturnFilter } from './content.signing.return.filter';

@Controller('rest/content-signing')
export class ContentSigningController {
  constructor(private readonly memoSigningService: MemoSigningService) {}

  @Get(RestEndpoint.CONTENT_SIGNING_SNAPSHOT)
  @UseGuards(RestGuard)
  async getSnapshot(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentActor() actor: ActorContext,
    @Res() response: Response
  ): Promise<Response | void> {
    if (!actor?.actorID) return response.sendStatus(401);
    try {
      const pdf = await this.memoSigningService.getSnapshot(attemptId, actor);
      response.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="memo-signing-preview.pdf"',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      return response.send(pdf);
    } catch (error) {
      return this.sendKnownError(error, response);
    }
  }

  @Get(RestEndpoint.CONTENT_SIGNING_COMPLETE)
  @UseGuards(RestGuard)
  @UseFilters(ContentSigningReturnFilter)
  async complete(
    @Query('correlationId') correlationId: unknown,
    @Query('clientState') clientState: unknown,
    @CurrentActor() actor: ActorContext,
    @Res() response: Response
  ): Promise<Response | void> {
    if (!actor?.actorID)
      throw new UnauthenticatedHttpException(
        'Memo signing return requires an authenticated session',
        LogContext.AUTH
      );
    response.set({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    try {
      if (
        !this.isSingleNonEmptyString(correlationId) ||
        !this.isSingleNonEmptyString(clientState)
      )
        throw new ValidationException(
          'Signing return parameters are invalid',
          LogContext.MEMOS
        );
      const result = await this.memoSigningService.completeMemoSigning(
        correlationId,
        clientState,
        actor
      );
      return response.redirect(
        302,
        `${result.memoUrl}?signingAttemptId=${encodeURIComponent(result.attemptId)}`
      );
    } catch (error) {
      return this.sendKnownError(error, response);
    }
  }

  private isSingleNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
  }

  private sendKnownError(error: unknown, response: Response): Response {
    const code = (error as { code?: string }).code;
    if (error instanceof ForbiddenException || code === 'FORBIDDEN_POLICY')
      return response.sendStatus(403);
    if (error instanceof ValidationException) return response.sendStatus(409);
    throw error;
  }
}
