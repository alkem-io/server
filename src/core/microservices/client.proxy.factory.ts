import { LogContext, MessagingQueue } from '@common/enums';
import { LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { AlkemioConfig } from '@src/types';

const QUEUE_CONTEXT_MAP: { [key in MessagingQueue]?: LogContext } = {
  [MessagingQueue.AUTH_RESET]: LogContext.AUTH,
};

export interface ClientProxyOptions {
  /** The queue survives a broker restart. Default true. */
  durable?: boolean;
  /**
   * Marks published messages persistent (delivery mode 2) so they survive a
   * broker restart while sitting in a durable queue — required for
   * at-least-once buses like the lifecycle outbox dispatcher. Default false, to
   * preserve the existing fire-and-forget clients' behaviour.
   */
  persistent?: boolean;
  /**
   * Extra x-arguments for the queue DECLARATION (e.g. `{ 'x-queue-type':
   * 'quorum' }`). The producer asserts the queue, so these MUST be literally
   * equivalent to the consumer's declaration or whichever declares second fails
   * PRECONDITION_FAILED. Omitted (not `arguments: undefined`) when unset, so the
   * existing classic-queue clients declare exactly `{ durable }` — an extra
   * `arguments` key is itself an inequivalent declaration.
   */
  queueArguments?: Record<string, unknown>;
}

// An options object rather than positional flags: the two booleans + the
// declaration args are otherwise trivial to swap silently at a call site.
export const clientProxyFactory = (
  queue: MessagingQueue | string,
  {
    durable = true,
    persistent = false,
    queueArguments,
  }: ClientProxyOptions = {}
) => {
  const context = QUEUE_CONTEXT_MAP[queue as MessagingQueue];
  return async (
    logger: LoggerService,
    configService: ConfigService<AlkemioConfig, true>
  ) => {
    try {
      const rabbitMqOptions = configService.get('microservices.rabbitmq', {
        infer: true,
      });
      const { user, password, host, port } = rabbitMqOptions.connection;
      const connectionString = `amqp://${user}:${password}@${host}:${port}?heartbeat=30`;

      const options = {
        urls: [connectionString],
        queue,
        queueOptions: {
          // the queue will survive a broker restart
          durable,
          ...(queueArguments ? { arguments: queueArguments } : {}),
        },
        persistent,
        noAck: true,
      };
      return ClientProxyFactory.create({ transport: Transport.RMQ, options });
    } catch (err) {
      logger.error(`Could not connect to RabbitMQ: ${err}`, context);
      return undefined;
    }
  };
};
