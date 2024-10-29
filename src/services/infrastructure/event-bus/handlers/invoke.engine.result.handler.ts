import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AiServerService } from '@services/ai-server/ai-server/ai.server.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Inject, LoggerService } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { InvokeEngineResult } from '../messages/invoke.engine.result';

@EventsHandler(InvokeEngineResult)
export class InvokeEngineResultHandler
  implements IEventHandler<InvokeEngineResult>
{
  constructor(
    private readonly aiServerService: AiServerService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async handle(event: InvokeEngineResult) {
    console.log('\n\n\n');
    console.log(event);
    console.log('\n\n\n');
  }
}
