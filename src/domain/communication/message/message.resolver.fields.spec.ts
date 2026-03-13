import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { IMessage } from './message.interface';
import { MessageResolverFields } from './message.resolver.fields';

describe('MessageResolverFields', () => {
  let resolver: MessageResolverFields;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MessageResolverFields, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(MessageResolverFields);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('sender', () => {
    it('should return null when message has no sender', async () => {
      const message = { id: 'msg-1', sender: '' } as IMessage;
      const loader = { load: vi.fn() } as any;

      const result = await resolver.sender(message, loader);

      expect(result).toBeNull();
      expect(loader.load).not.toHaveBeenCalled();
    });

    it('should return sender when resolved successfully', async () => {
      const mockSender = { id: 'user-1', nameID: 'test-user' };
      const message = { id: 'msg-1', sender: 'agent-1' } as IMessage;
      const loader = { load: vi.fn().mockResolvedValue(mockSender) } as any;

      const result = await resolver.sender(message, loader);

      expect(result).toBe(mockSender);
      expect(loader.load).toHaveBeenCalledWith('agent-1');
    });

    it('should log warning and return null when sender cannot be resolved', async () => {
      const message = { id: 'msg-1', sender: 'agent-1' } as IMessage;
      const loader = { load: vi.fn().mockResolvedValue(null) } as any;

      const result = await resolver.sender(message, loader);

      expect(result).toBeNull();
    });
  });
});
