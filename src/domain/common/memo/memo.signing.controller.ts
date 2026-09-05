import { CurrentActor } from '@common/decorators';
import { ActorContext } from '@core/actor-context/actor.context';
import { RestGuard } from '@core/authorization/rest.guard';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { MemoSigningService } from './memo.signing.service';

@Controller('rest/content-signing')
export class MemoSigningController {
  constructor(private readonly memoSigningService: MemoSigningService) {}

  @Get(':attemptId/snapshot')
  @UseGuards(RestGuard)
  async getSnapshot(
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @CurrentActor() actor: ActorContext,
    @Res() response: Response
  ): Promise<void> {
    const pdf = await this.memoSigningService.getSnapshot(attemptId, actor);
    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="memo-signing-preview.pdf"',
      'Cache-Control': 'private, no-store',
    });
    response.send(pdf);
  }
}
