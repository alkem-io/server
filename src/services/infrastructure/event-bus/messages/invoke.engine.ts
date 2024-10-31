import { IEvent } from '@nestjs/cqrs';
import { AiPersonaEngineAdapterInvocationInput } from '@services/ai-server/ai-persona-engine-adapter/dto/ai.persona.engine.adapter.dto.invocation.input';

export class InvokeEngine implements IEvent {
  constructor(public input: AiPersonaEngineAdapterInvocationInput) {}
}
