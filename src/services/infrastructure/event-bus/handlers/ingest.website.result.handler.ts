import { LogContext } from '@common/enums';
import { Inject, LoggerService } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IngestWebsiteResult } from '../messages/ingest.website.result.event';
import { IngestionPurpose, IngestionResult } from '../messages/types';

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
    const response = event.response;

    this.logger.verbose?.(
      `IngestWebsiteResultHandler invoked. Event data: PersonaId: ${response?.personaId}; Result: ${response?.result}`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    if (response?.result === IngestionResult.FAILURE) {
      return;
    }

    if (!response?.personaId || response.purpose === IngestionPurpose.CONTEXT) {
      this.logger.verbose?.(
        'Skipping persona BoK timestamp update (missing personaId or purpose=CONTEXT)',
        LogContext.AI_SERVER_EVENT_BUS
      );
      return;
    }

    this.logger.verbose?.(
      `Invoking updatePersonaBoKLastUpdated for Persona: ${response.personaId}`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    const lastUpdated = response.timestamp
      ? new Date(response.timestamp)
      : new Date();
    this.aiServerService.updatePersonaBoKLastUpdated(
      response.personaId,
      lastUpdated
    );
  }
}
