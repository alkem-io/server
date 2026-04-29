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
    const response = event.response;

    this.logger.verbose?.(
      `IngestBodyOfKnowledgeResultHandler invoked. Event data: PersonaId: ${response?.personaId}; Result: ${response?.result}`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    if (
      !response?.personaId ||
      !response.timestamp ||
      response.purpose === IngestionPurpose.CONTEXT
    ) {
      this.logger.verbose?.(
        'Skipping persona BoK timestamp update (missing personaId/timestamp or purpose=CONTEXT)',
        LogContext.AI_SERVER_EVENT_BUS
      );

      return;
    }

    this.logger.verbose?.(
      `Invoking updatePersonaBoKLastUpdated for Persona: ${response.personaId}`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    if (response.result === IngestionResult.SUCCESS) {
      this.aiServerService.updatePersonaBoKLastUpdated(
        response.personaId,
        new Date(response.timestamp)
      );
    } else {
      if (response.error?.code === ErrorCode.VECTOR_INSERT) {
        this.aiServerService.updatePersonaBoKLastUpdated(
          response.personaId,
          null
        );
      }
    }
  }
}
