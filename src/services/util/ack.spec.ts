import { RmqContext } from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';
import { vi } from 'vitest';
import { ack } from './ack';

describe('ack', () => {
  it('should acknowledge the message on the channel', () => {
    const mockMessage = { content: Buffer.from('test') } as unknown as Message;
    const mockChannel = { ack: vi.fn() } as unknown as Channel;
    const mockContext = {
      getChannelRef: vi.fn().mockReturnValue(mockChannel),
      getMessage: vi.fn().mockReturnValue(mockMessage),
    } as unknown as RmqContext;

    ack(mockContext);

    expect(mockChannel.ack).toHaveBeenCalledWith(mockMessage);
    expect(mockChannel.ack).toHaveBeenCalledTimes(1);
  });

  it('should retrieve the channel and message from the context', () => {
    const mockMessage = {} as unknown as Message;
    const mockChannel = { ack: vi.fn() } as unknown as Channel;
    const mockContext = {
      getChannelRef: vi.fn().mockReturnValue(mockChannel),
      getMessage: vi.fn().mockReturnValue(mockMessage),
    } as unknown as RmqContext;

    ack(mockContext);

    expect(mockContext.getChannelRef).toHaveBeenCalledTimes(1);
    expect(mockContext.getMessage).toHaveBeenCalledTimes(1);
  });
});
