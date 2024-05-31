import { RmqContext } from '@nestjs/microservices';
import { Channel, Message } from 'amqplib';

export const ack = (context: RmqContext) => {
  const channel: Channel = context.getChannelRef();
  const originalMsg = context.getMessage() as Message;
  channel.ack(originalMsg);
};
