import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CalendarEventModule } from '@domain/timeline/event/event.module';
import { Module } from '@nestjs/common';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { CalendarEventIcsController } from './calendar-event-ics.controller';
import { CalendarEventIcsRedirectFilter } from './calendar-event-ics.redirect.filter';
import { CalendarEventIcsService } from './calendar-event-ics.service';

@Module({
  imports: [CalendarEventModule, AuthorizationModule, UrlGeneratorModule],
  controllers: [CalendarEventIcsController],
  providers: [CalendarEventIcsService, CalendarEventIcsRedirectFilter],
})
export class CalendarEventIcsModule {}
