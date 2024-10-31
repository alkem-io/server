import { IEvent } from '@nestjs/cqrs';
import { AiPersonaEngineAdapterInvocationInput } from '@services/ai-server/ai-persona-engine-adapter/dto/ai.persona.engine.adapter.dto.invocation.input';
export class InvokeEngineResult implements IEvent {
  constructor(
    public input: AiPersonaEngineAdapterInvocationInput,
    public response: { answer: string }
  ) {}
}
