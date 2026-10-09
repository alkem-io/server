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

describe('reference-only attachment projection', () => {
  it('projects native media metadata without a file ID, URL or storage lookup', async () => {
    const resolver = new MessageResolverFields(undefined as any);
    const attachment = {
      media_id: 'native-ref',
      display_name: 'résumé.png',
      mime_type: 'image/png',
      size: 7,
      width: 2,
      height: 3,
    };
    Object.defineProperty(attachment, 'document_id', {
      get: () => {
        throw new Error('legacy hint must not be read');
      },
    });
    const result = await resolver.attachments({
      rawAttachments: [attachment],
    } as any);
    expect(result).toEqual([
      {
        externalReference: 'native-ref',
        displayName: 'résumé.png',
        mimeType: 'image/png',
        size: 7,
        width: 2,
        height: 3,
      },
    ]);
    expect(result[0]).not.toHaveProperty('id');
    expect(result[0]).not.toHaveProperty('url');
  });
  it('keeps missing local references unavailable without querying storage', async () => {
    const resolver = new MessageResolverFields(undefined as any);
    expect(
      await resolver.attachments({
        rawAttachments: [
          { display_name: 'remote.pdf', mime_type: 'application/pdf', size: 2 },
        ],
      } as any)
    ).toEqual([
      {
        externalReference: undefined,
        displayName: 'remote.pdf',
        mimeType: 'application/pdf',
        size: 2,
        width: undefined,
        height: undefined,
      },
    ]);
  });
});
