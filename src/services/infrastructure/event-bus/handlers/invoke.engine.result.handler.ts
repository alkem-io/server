import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { InvokeEngineResult } from '../messages/invoke.engine.result';

@EventsHandler(InvokeEngineResult)
export class InvokeEngineResultHandler
  implements IEventHandler<InvokeEngineResult>
{
  constructor(private readonly aiServerService: AiServerService) {}

  async handle(event: InvokeEngineResult) {
    await this.aiServerService.handleInvokeEngineResult(event);
  }
}
