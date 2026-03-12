import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { InvokeEngine } from '@services/infrastructure/event-bus/messages/invoke.engine';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { AiPersonaEngineAdapter } from './ai.persona.engine.adapter';

describe('AiPersonaEngineAdapter', () => {
  let adapter: AiPersonaEngineAdapter;
  let eventBus: Record<string, Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiPersonaEngineAdapter],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    adapter = module.get(AiPersonaEngineAdapter);
    eventBus = module.get(EventBus) as unknown as Record<string, Mock>;
  });

  describe('invoke', () => {
    it('should publish an InvokeEngine event with the provided input', () => {
      const input = {
        engine: 'expert',
        prompt: ['test prompt'],
        message: 'Hello',
        userID: 'user-1',
      } as any;

      adapter.invoke(input);

      expect(eventBus.publish).toHaveBeenCalledTimes(1);
      const publishedEvent = eventBus.publish.mock.calls[0][0];
      expect(publishedEvent).toBeInstanceOf(InvokeEngine);
    });

    it('should pass the event data through to the InvokeEngine event', () => {
      const input = {
        engine: 'guidance',
        prompt: ['prompt'],
        message: 'test message',
        userID: 'user-2',
        contextID: 'ctx-1',
      } as any;

      adapter.invoke(input);

      const publishedEvent = eventBus.publish.mock.calls[0][0];
      expect(publishedEvent.input).toEqual(input);
    });
  });
});
