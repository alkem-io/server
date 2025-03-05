import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { IngestWebsiteResult } from '../messages/ingest.website.result.event';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';

@EventsHandler(IngestWebsiteResult)
export class IngestWebsiteResultHandler
  implements IEventHandler<IngestWebsiteResult>
{
  constructor(
    private readonly aiServerService: AiServerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async handle(event: IngestWebsiteResult) {
    // this handler should be similar to the ingest body of knowledge one
    // in order to do that I need to add a spearate type in the base Python VC library and wire it here
    // not ime for that right now but will track it and do it rather soon
    //
    // for now if an exception occurs in the ingest website service NO response will be recieved by the server
    // hence we can conclude that if we are here the result is a success
    const personaId = event.original.personaServiceId;
    this.logger.verbose?.(
      `IngestSpaceResultHandler invoked. Event data: PersonaServiceId: ${personaId}; Result: success`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    if (!personaId) {
      this.logger.verbose?.('Returning?', LogContext.AI_SERVER_EVENT_BUS);

      return;
    }

    this.logger.verbose?.(
      `Invoking updatePersonaBoKLastUpdated for PeresonaService: ${personaId}`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    if (personaId) {
      let now = new Date();
      if (event.timestamp) {
        now = new Date(event.timestamp);
      }
      this.aiServerService.updatePersonaBoKLastUpdated(
        event.original.personaServiceId,
        now
      );
    }
  }
}
