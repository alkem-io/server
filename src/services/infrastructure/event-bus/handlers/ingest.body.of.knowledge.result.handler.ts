import { LogContext } from '@common/enums';
import { Inject, LoggerService } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IngestBodyOfKnowledgeResult } from '../messages/ingest.body.of.knowledge.result.event';
import {
  ErrorCode,
  IngestionPurpose,
  IngestionResult,
} from '../messages/types';

@EventsHandler(IngestBodyOfKnowledgeResult)
export class IngestBodyOfKnowledgeResultHandler
  implements IEventHandler<IngestBodyOfKnowledgeResult>
{
  constructor(
    private readonly aiServerService: AiServerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async handle(event: IngestBodyOfKnowledgeResult) {
    this.logger.verbose?.(
      `IngestSpaceResultHandler invoked. Event data: PersonaId: ${event.personaId}; Result: ${event.result}`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    if (
      !event.personaId ||
      !event.timestamp ||
      event.purpose === IngestionPurpose.CONTEXT
    ) {
      this.logger.verbose?.('Returning?', LogContext.AI_SERVER_EVENT_BUS);

      return;
    }

    this.logger.verbose?.(
      `Invoking updatePersonaBoKLastUpdated for Peresona: ${event.personaId}`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    if (event.result === IngestionResult.SUCCESS) {
      this.aiServerService.updatePersonaBoKLastUpdated(
        event.personaId,
        new Date(event.timestamp)
      );
    } else {
      if (event.error?.code === ErrorCode.VECTOR_INSERT) {
        this.aiServerService.updatePersonaBoKLastUpdated(event.personaId, null);
      }
    }
  }
}
