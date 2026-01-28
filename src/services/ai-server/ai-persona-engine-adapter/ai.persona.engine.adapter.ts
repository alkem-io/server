import { Injectable } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { InvokeEngine } from '@services/infrastructure/event-bus/messages/invoke.engine';
import { AiPersonaEngineAdapterInvocationInput } from './dto/ai.persona.engine.adapter.dto.invocation.input';

@Injectable()
export class AiPersonaEngineAdapter {
  constructor(private eventBus: EventBus) {}
  public invoke(eventData: AiPersonaEngineAdapterInvocationInput): void {
    this.eventBus.publish(new InvokeEngine(eventData));
  }
}
