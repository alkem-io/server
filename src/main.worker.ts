// MUST be set before any module is imported: makes subscriptionFactory return
// in-memory PubSub everywhere, so the worker opens no GraphQL-subscription
// RabbitMQ connections/consumers (those are wired into domain modules we pull in).
process.env.ALKEMIO_DISABLE_SUBSCRIPTIONS = 'true';

import { LogContext, MessagingQueue } from '@common/enums';
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
      // One unacked message per pod at a time. The RMQ default is 0 (unlimited):
      // a single pod would pull the whole queue and run every reset concurrently,
      // each holding large authorization arrays (OOM risk against the 3.5Gi limit)
      // and trampling the parent->child ordering the inheritance chain depends on.
      // With 1, work is spread across pods as competing consumers, one reset each.
      prefetchCount: 1,
      socketOptions: {
        reconnectTimeInSeconds: 5,
        heartbeatIntervalInSeconds:
          process.env.NODE_ENV === 'production' ? 30 : 240,
      },
      // Manual ack — the controller acks/rejects explicitly (retry handling).
      noAck: false,
    },
  });

  // --- Graceful shutdown (worker-only) ---------------------------------------
  // This binary runs as PID 1 (Dockerfile `CMD ["node", "dist/main.js"]`, no
  // init wrapper). The Linux kernel does NOT apply the default "terminate"
  // disposition to PID 1 for SIGTERM/SIGINT unless the process installs its own
  // handler — so without the line below a SIGTERM (sent by kubelet on
  // scale-down/rollout) would be IGNORED and the pod would sit until the
  // terminationGracePeriodSeconds deadline, then get SIGKILLed.
  //
  // enableShutdownHooks() registers process SIGTERM/SIGINT listeners that call
  // app.close(), which closes the RMQ microservice: the consumer is cancelled
  // (no new deliveries) and the channel/connection are torn down, then the
  // process exits promptly — well inside the grace window instead of stalling
  // to SIGKILL.
  //
  // In-flight safety: a reset already running when SIGTERM lands continues on
  // the event loop. If it finishes and acks before app.close() tears the
  // channel down, the message is consumed normally. If the channel closes
  // first, the still-unacked message is requeued by the broker and redelivered
  // on the next scale-up — the handlers are idempotent and carry an explicit
  // retry counter, so no work is lost either way.
  app.enableShutdownHooks();

  // Observability only — Nest's enableShutdownHooks listener does the actual
  // app.close(). This just records that a shutdown signal arrived.
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () =>
      logger.log?.(
        `Received ${signal}: draining auth-reset worker and shutting down.`,
        LogContext.AUTH
      )
    );
  }

  // Run module lifecycle hooks (onModuleInit / onApplicationBootstrap) BEFORE
  // the RMQ consumer starts pulling messages. NestFactory.create() only builds
  // the DI graph; with no app.listen() (headless worker) nothing else triggers
  // these hooks, and startAllMicroservices() does not. Without this the consumer
  // could receive a reset before TypeORM/cache/bootstrap init completed.
  await app.init();

  await app.startAllMicroservices();
  // Intentionally no app.listen() — headless consumer, no HTTP surface.
};
