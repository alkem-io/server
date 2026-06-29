// MUST be set before any module is imported: makes subscriptionFactory return
// in-memory PubSub everywhere, so the worker opens no GraphQL-subscription
// RabbitMQ connections/consumers (those are wired into domain modules we pull in).
process.env.ALKEMIO_DISABLE_SUBSCRIPTIONS = 'true';

import { MessagingQueue } from '@common/enums';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthResetWorkerModule } from './core/bootstrap/auth-reset.worker.module';

/**
 * Bootstrap the dedicated authorization/license reset worker.
 *
 * Boots the restricted AuthResetWorkerModule (no GraphQL/REST/OIDC/bootstrap)
 * and binds ONLY the auth-reset RabbitMQ queue. No HTTP server is started — this
 * is a headless queue consumer. Selected by the main.ts dispatcher when
 * AUTH_RESET_WORKER === 'true'. The full server publishes reset events but never
 * consumes this queue.
 */
export const bootstrapAuthResetWorker = async () => {
  // ALKEMIO_DISABLE_SUBSCRIPTIONS is set unconditionally at module top-level
  // (line 4) — that runs the instant main.ts imports this module, before
  // NestFactory builds the graph. No need to re-set it here.
  const app = await NestFactory.create(AuthResetWorkerModule, {
    logger: process.env.NODE_ENV === 'production' ? false : undefined,
    bodyParser: false,
  });

  const configService: ConfigService<AlkemioConfig, true> =
    app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const connectionOptions = configService.get(
    'microservices.rabbitmq.connection',
    { infer: true }
  );
  const queue =
    configService.get('microservices.rabbitmq.auth_reset.queue', {
      infer: true,
    }) ?? MessagingQueue.AUTH_RESET;

  const heartbeat = process.env.NODE_ENV === 'production' ? 30 : 120;
  const amqpEndpoint = `amqp://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}?heartbeat=${heartbeat}`;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [amqpEndpoint],
      queue,
      queueOptions: { durable: true },
      socketOptions: {
        reconnectTimeInSeconds: 5,
        heartbeatIntervalInSeconds:
          process.env.NODE_ENV === 'production' ? 30 : 240,
      },
      // Manual ack — the controller acks/rejects explicitly (retry handling).
      noAck: false,
    },
  });

  await app.startAllMicroservices();
  // Intentionally no app.listen() — headless consumer, no HTTP surface.
};
