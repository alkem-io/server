import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { AlkemioConfig } from '@src/types';

/**
 * Module that provides AMQP RPC functionality for the Communication Adapter.
 *
 * Uses @golevelup/nestjs-rabbitmq with Direct Reply-To queue pattern
 * for standard AMQP RPC communication with the Go Matrix Adapter (Watermill).
 *
 * Key features:
 * - Standard AMQP RPC using correlation_id and reply_to properties
 * - Direct Reply-To queue (amq.rabbitmq.reply-to) for responses
 * - Compatible with any language/framework that supports standard AMQP RPC
 */
@Global()
@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<AlkemioConfig, true>) => {
        const rbmqConfig = configService.get(
          'microservices.rabbitmq.connection',
          { infer: true }
        );
        const communicationsConfig = configService.get('communications', {
          infer: true,
        });

        const uri = `amqp://${rbmqConfig.user}:${rbmqConfig.password}@${rbmqConfig.host}:${rbmqConfig.port}`;

        // Default timeout from config or 10 seconds
        const timeout =
          communicationsConfig?.matrix?.connection_timeout ?? 10000;

        return {
          name: 'communication-adapter',
          uri,
          connectionInitOptions: {
            // Don't wait for connection - let app start even if RabbitMQ is down
            wait: false,
          },
          // Enable Direct Reply-To for RPC functionality
          enableDirectReplyTo: true,
          // Default RPC timeout
          defaultRpcTimeout: timeout,
          // No exchanges needed - we publish directly to queues using default exchange
          exchanges: [],
          // No queues to declare - controller handlers will auto-subscribe
          // to events using routing keys (e.g., "communication.message.received")
          queues: [],
          // Enable controller handler discovery for @EventPattern decorators
          enableControllerDiscovery: true,
        };
      },
    }),
  ],
  exports: [RabbitMQModule],
})
export class CommunicationRpcModule {}
