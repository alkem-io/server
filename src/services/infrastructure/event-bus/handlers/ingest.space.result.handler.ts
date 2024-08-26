import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import {
  IngestSpaceResult,
  SpaceIngestionResult,
} from '../messages/ingest.space.result.event';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';

@EventsHandler(IngestSpaceResult)
export class IngestSpaceResultHandler
  implements IEventHandler<IngestSpaceResult>
{
  constructor(private readonly aiServerService: AiServerService) {}

  async handle(event: IngestSpaceResult) {
    if (
      !event.personaServiceId ||
      !event.timestamp ||
      event.result === SpaceIngestionResult.FAILURE
    ) {
      return;
    }
    this.aiServerService.updatePersonaBoKLastUpdate(
      event.personaServiceId,
      new Date(event.timestamp)
    );
  }
}
