import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { IMessageReaction } from './message.reaction.interface';
import { MessageReactionResolverFields } from './message.reaction.resolver.fields';

describe('MessageReactionResolverFields', () => {
  let resolver: MessageReactionResolverFields;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageReactionResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(MessageReactionResolverFields);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('sender', () => {
    it('should return null when reaction has no sender', async () => {
      const reaction = {
        id: 'reaction-1',
        sender: '',
      } as IMessageReaction;
      const loader = { load: vi.fn() } as any;

      const result = await resolver.sender(reaction, loader);

      expect(result).toBeNull();
      expect(loader.load).not.toHaveBeenCalled();
    });

    it('should return sender when resolved successfully', async () => {
      const mockUser = { id: 'user-1', nameID: 'test-user' };
      const reaction = {
        id: 'reaction-1',
        sender: 'agent-1',
      } as IMessageReaction;
      const loader = { load: vi.fn().mockResolvedValue(mockUser) } as any;

      const result = await resolver.sender(reaction, loader);

      expect(result).toBe(mockUser);
      expect(loader.load).toHaveBeenCalledWith('agent-1');
    });

    it('should log warning and return null when sender cannot be resolved', async () => {
      const reaction = {
        id: 'reaction-1',
        sender: 'agent-1',
      } as IMessageReaction;
      const loader = { load: vi.fn().mockResolvedValue(null) } as any;

      const result = await resolver.sender(reaction, loader);

      expect(result).toBeNull();
    });
  });
});
