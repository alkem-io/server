import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { IngestWebsiteResult } from '../messages/ingest.website.result.event';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { IngestionResult } from '../messages/types';

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
    const original = event.original;
    const response = event.response;

    const personaId = original.personaId;
    if (response.result === IngestionResult.FAILURE) {
      this.logger.verbose?.(
        `IngestWebsiteResultHandler invoked. Event data: PersonaId: ${personaId}; Result: failure`,
        LogContext.AI_SERVER_EVENT_BUS
      );
      return;
    }
    this.logger.verbose?.(
      `IngestWebsiteResultHandler invoked. Event data: PersonaId: ${personaId}; Result: success`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    if (!personaId) {
      this.logger.verbose?.('Returning?', LogContext.AI_SERVER_EVENT_BUS);
      return;
    }
    this.logger.verbose?.(
      `Invoking updatePersonaBoKLastUpdated for Peresona: ${personaId}`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    let now = new Date();
    if (response.timestamp) {
      now = new Date(response.timestamp);
    }
    void this.aiServerService.updatePersonaBoKLastUpdated(
      original.personaId,
      now
    );
  }
}
