import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  ErrorCode,
  IngestSpaceResult,
  SpaceIngestionPurpose,
  SpaceIngestionResult,
} from '../messages/ingest.space.result.event';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';

@EventsHandler(IngestSpaceResult)
export class IngestSpaceResultHandler
  implements IEventHandler<IngestSpaceResult>
{
  constructor(
    private readonly aiServerService: AiServerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async handle(event: IngestSpaceResult) {
    this.logger.verbose?.(
      `IngestSpaceResultHandler invoked. Event data: PersonaServiceId: ${event.personaServiceId}; Result: ${event.result}`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    if (
      !event.personaServiceId ||
      !event.timestamp ||
      event.purpose === SpaceIngestionPurpose.CONTEXT
    ) {
      return;
    }

    this.logger.verbose?.(
      `Invoking updatePersonaBoKLastUpdated for PeresonaService: ${event.personaServiceId}`,
      LogContext.AI_SERVER_EVENT_BUS
    );

    if (event.result === SpaceIngestionResult.SUCCESS) {
      this.aiServerService.updatePersonaBoKLastUpdated(
        event.personaServiceId,
        new Date(event.timestamp)
      );
    } else {
      if (event.error?.code === ErrorCode.VECTOR_INSERT) {
        this.aiServerService.updatePersonaBoKLastUpdated(
          event.personaServiceId,
          null
        );
      }
    }
  }
}
