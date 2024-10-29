import { IEvent } from '@nestjs/cqrs';
import { AiPersonaEngineAdapterQueryInput } from '@services/ai-server/ai-persona-engine-adapter/dto/ai.persona.engine.adapter.dto.question.input';
export class InvokeEngine implements IEvent {
  constructor(public eventData: AiPersonaEngineAdapterQueryInput) {}
}
