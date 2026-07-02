// MUST be set before any module is imported: makes subscriptionFactory return
// in-memory PubSub everywhere, so the worker opens no GraphQL-subscription
// RabbitMQ connections/consumers (those are wired into domain modules we pull in).
process.env.ALKEMIO_DISABLE_SUBSCRIPTIONS = 'true';

import { LogContext, MessagingQueue } from '@common/enums';
import { DrainableRmqServer } from '@core/microservices/drainable-rmq.server';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { AuthResetWorkerState } from '@services/auth-reset/subscriber/auth-reset.worker-state.service';
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

  // Custom RMQ strategy (instead of transport+options) so the SIGTERM handler
  // below can cancel the consumer WITHOUT tearing the channel out from under an
  // in-flight reset. Same options as the stock Transport.RMQ server.
  const rmqServer = new DrainableRmqServer({
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
  });
  app.connectMicroservice<MicroserviceOptions>({ strategy: rmqServer });

  const workerState = app.get(AuthResetWorkerState);

  // --- Graceful drain on shutdown (worker-only) ------------------------------
  // This binary runs as PID 1 (Dockerfile `CMD ["node", "dist/main.js"]`, no
  // init wrapper). The Linux kernel does NOT apply the default "terminate"
  // disposition to PID 1 for SIGTERM/SIGINT unless the process installs its own
  // handler — so without the handler below a SIGTERM (sent by kubelet on
  // scale-down/rollout) would be IGNORED and the pod would sit until the
  // terminationGracePeriodSeconds deadline, then get SIGKILLed.
  //
  // Drain sequence:
  //   1. rmqServer.stopConsuming() — AMQP basic.cancel: the broker stops
  //      delivering NEW resets to this pod. The channel stays OPEN so an
  //      in-flight reset can still ack the message it is processing.
  //   2. workerState.waitForIdle() — wait for the active reset (0 or 1, given
  //      prefetchCount: 1) to finish and ack, bounded by the drain timeout.
  //   3. app.close() — tear down. Any message still unacked at this point is
  //      requeued by the broker and redelivered to a live pod later.
  //
  // The timeout MUST sit comfortably below the pod's terminationGracePeriod so
  // step 3 runs before SIGKILL. Handlers are idempotent and carry an explicit
  // x-retry-count header, so a requeue on timeout loses no work.
  // Max wait for the in-flight reset (a ceiling, not a fixed wait);
  // keep it a few seconds BELOW the deployment's terminationGracePeriodSeconds so app.close() runs before SIGKILL.
  const drainTimeoutMs =
    Number(process.env.AUTH_RESET_DRAIN_TIMEOUT_SECONDS ?? 55) * 1000;
  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.log?.(
      `Received ${signal}: cancelling auth-reset consumer, draining in-flight work.`,
      LogContext.AUTH
    );
    try {
      await rmqServer.stopConsuming();
      const drained = await workerState.waitForIdle(drainTimeoutMs);
      if (!drained) {
        logger.warn?.(
          `Auth-reset drain timed out after ${drainTimeoutMs}ms with ${workerState.activeCount} reset(s) in flight; unacked message(s) will be requeued on close.`,
          LogContext.AUTH
        );
      }
    } catch (error: any) {
      logger.error?.(
        `Error during auth-reset worker drain: ${error?.message}`,
        error?.stack,
        LogContext.AUTH
      );
    } finally {
      await app.close();
      process.exit(0);
    }
  };
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => void shutdown(signal));
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
