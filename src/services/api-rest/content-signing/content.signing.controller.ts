import { CurrentActor } from '@common/decorators';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import { ForbiddenException, ValidationException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { RestGuard } from '@core/authorization/rest.guard';
import { MemoSigningService } from '@domain/common/memo/memo.signing.service';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';

@Controller('rest/content-signing')
export class ContentSigningController {
  constructor(private readonly memoSigningService: MemoSigningService) {}

  @Get(RestEndpoint.CONTENT_SIGNING_SNAPSHOT)
  @UseGuards(RestGuard)
  async getSnapshot(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentActor() actor: ActorContext,
    @Res() response: Response
  ): Promise<Response> {
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
      const code = (error as { code?: string }).code;
      if (error instanceof ForbiddenException || code === 'FORBIDDEN_POLICY')
        return response.sendStatus(403);
      if (error instanceof ValidationException) return response.sendStatus(409);
      throw error;
    }
  }
}
