import { CurrentActor } from '@common/decorators';
import { RestEndpoint } from '@common/enums/rest.endpoint';
import { ActorContext } from '@core/actor-context/actor.context';
import { RestGuard } from '@core/authorization/rest.guard';
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CalendarEventIcsRedirectFilter } from './calendar-event-ics.redirect.filter';
import { CalendarEventIcsService } from './calendar-event-ics.service';

@Controller('rest/calendar')
export class CalendarEventIcsController {
  constructor(
    private readonly calendarEventIcsService: CalendarEventIcsService
  ) {}

  @Get(RestEndpoint.CALENDAR_EVENT_ICS)
  @UseGuards(RestGuard)
  @UseFilters(CalendarEventIcsRedirectFilter)
  async downloadIcs(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actorContext: ActorContext,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    if (!actorContext || !actorContext.actorID) {
      const returnUrl = req.originalUrl ?? req.url ?? '/';
      res.redirect(302, `/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    const { filename, content } =
      await this.calendarEventIcsService.generateIcs(id, actorContext);

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    });
    res.send(content);
  }
}
