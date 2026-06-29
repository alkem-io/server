import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import session from 'express-session';
import helmet from 'helmet';
import Redis from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import './config/aliases';
import { MessagingQueue } from '@common/enums';
import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AlkemioConfig } from '@src/types';
import { json } from 'body-parser';
import { useContainer } from 'class-validator';
import cookieParser from 'cookie-parser';
import { NextFunction, Request, Response } from 'express';
import { renderGraphiQL } from 'graphql-helix';
import { graphqlUploadExpress } from 'graphql-upload';
// biome-ignore lint/correctness/noUnusedImports: apmAgent import has side effects that initialize APM
import { apmAgent } from './apm';
import { NonInteractiveLoginConfig } from './core/auth/non-interactive-login/non-interactive-login.config';
import { setSessionMiddlewares } from './core/auth/oidc/session-middleware.holder';
import {
  buildOidcSessionRedisStore,
  buildSessionRenewalMiddleware,
} from './core/auth/oidc/session-store.redis';
import { BootstrapService } from './core/bootstrap/bootstrap.service';
import { faviconMiddleware } from './core/middleware/favicon.middleware';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, {
    /***
     * if the logger is provided at a later stage via 'useLogger' after the app has initialized, Nest falls back to the default logger
     * while initializing, which logs a lot of info logs, which we don't have control over and don't want tracked.
     * The logger is disabled while the app is loading ONLY on production to avoid the messages;
     * then the costume logger is applied as usual
     */
    logger: process.env.NODE_ENV === 'production' ? false : undefined,
    // Disable default body parsers - we configure them manually below
    bodyParser: false,
  });
  const configService: ConfigService<AlkemioConfig, true> =
    app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  const bootstrapService: BootstrapService = app.get(BootstrapService);

  app.useLogger(logger);

  // Defense-in-depth boot guard for the non-interactive-login feature.
  // Throws (and aborts startup) if NODE_ENV=production collides with
  // identity.authentication.providers.non_interactive_login.enabled, or
  // if the feature is enabled without a strong signing_key.
  app.get(NonInteractiveLoginConfig).assertSafe();
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await bootstrapService.bootstrap();
  const { enabled, methods, origin, allowed_headers } = configService.get(
    'security.cors',
    { infer: true }
  );
  if (enabled) {
    // `Access-Control-Allow-Origin: *` is incompatible with credentials, so
    // when origin is the wildcard we reflect the request Origin instead.
    const corsOrigin =
      typeof origin === 'string' && origin.trim() === '*' ? true : origin;
    app.enableCors({
      origin: corsOrigin,
      allowedHeaders: allowed_headers,
      methods,
      // Required so the browser sends the alkemio_session cookie on
      // cross-origin GraphQL requests from the SPA (and accepts Set-Cookie
      // on the OIDC callback). Client must use credentials: 'include'.
      credentials: true,
    });
  }

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(faviconMiddleware);
  const cookieParserMiddleware = cookieParser();
  app.use(cookieParserMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  // T016 — express-session + connect-redis bootstrap. MUST run before any
  // OIDC controller so the callback can regenerate() against a live store.
  // Key layout: `alkemio:sid:<sid>`. The cookie carries the sid only — no
  // tokens. Two clocks (FR-018 / FR-020a): a 14-day sliding idle window
  // (cookie maxAge + Redis key TTL) and a 30-day fixed absolute ceiling
  // (`absolute_expires_at` payload check). `rolling` is false and the idle
  // window is renewed lazily by sessionRenewalMiddleware so we don't re-issue
  // the cookie / re-write Redis on every request.
  const oidcConfig = configService.get(
    'identity.authentication.providers.oidc',
    {
      infer: true,
    }
  );
  const redisConfig = configService.get('storage.redis', { infer: true });
  const sessionRedis = new Redis({
    host: redisConfig.host,
    port: Number(redisConfig.port),
  });
  const idleTtlS = oidcConfig.cookie.idle_ttl_s;
  const sessionStore = buildOidcSessionRedisStore(sessionRedis, idleTtlS);
  const sessionMiddleware = session({
    store: sessionStore,
    secret: oidcConfig.session_signing_key,
    name: oidcConfig.cookie.name,
    resave: false,
    saveUninitialized: false,
    // Renewal is handled lazily by sessionRenewalMiddleware (Kratos-style
    // back-half extend) — keep express-session from re-issuing the cookie on
    // every request.
    rolling: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: oidcConfig.cookie.secure,
      domain: oidcConfig.cookie.domain || undefined,
      maxAge: idleTtlS * 1000,
    },
  });
  app.use(sessionMiddleware);
  // FR-018 — lazily slide the idle window only when it crosses the half-life
  // mark. MUST run after express-session has populated req.session.
  app.use(buildSessionRenewalMiddleware(idleTtlS));

  // FR-023 (WS addendum) — graphql-ws upgrades bypass the Express pipeline,
  // so cookie-parser and express-session never run on the upgrade
  // IncomingMessage and `req.sessionID`/`req.cookies` are undefined.
  // Publish both instances so the GraphQL context callback can replay them
  // against the upgrade request before CookieSessionStrategy reads them.
  setSessionMiddlewares(cookieParserMiddleware, sessionMiddleware);

  app.use(
    graphqlUploadExpress({
      maxFileSize: configService.get('storage.file.max_file_size', {
        infer: true,
      }),
    })
  );

  const { max_json_payload_size, port } = configService.get('hosting', {
    infer: true,
  });
  // JSON body parsing - skip for MCP routes (MCP SDK handles its own parsing)
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/rest/mcp')) {
      return next();
    }
    json({ limit: max_json_payload_size })(req, res, next);
  });

  // Serve the GraphiQL interface at '/graphiql'
  app.use('/graphiql', (_req: Request, res: Response) => {
    res.send(
      renderGraphiQL({
        endpoint: '/graphql',
        //subscriptionsEndpoint: '/graphql',
      })
    );
  });

  await app.listen(port);

  const connectionOptions = configService.get(
    'microservices.rabbitmq.connection',
    { infer: true }
  );

  const heartbeat = process.env.NODE_ENV === 'production' ? 30 : 120;
  const amqpEndpoint = `amqp://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}?heartbeat=${heartbeat}`;
  // Deployment-role split (microservices.rabbitmq.auth_reset). On the dedicated,
  // KEDA-scaled worker deployment `worker: true` binds ONLY the auth-reset
  // queue; the normal server keeps it false, binds every OTHER queue and never
  // consumes auth-reset. Because auth-reset is a single durable queue with
  // competing consumers, the normal server MUST NOT bind it or it would steal
  // a share of the reset messages. One image, behaviour selected by config.
  const authReset = configService.get('microservices.rabbitmq.auth_reset', {
    infer: true,
  });

  if (authReset.worker) {
    connectMicroservice(app, amqpEndpoint, authReset.queue);
  } else {
    // Kratos events (e.g. USER_PASSWORD_CHANGED published by the Go kratos-webhooks
    // service). Dedicated durable queue — do NOT also bind it via @golevelup
    // @RabbitSubscribe; a competing consumer would steal messages (see the
    // golevelup note below).
    connectMicroservice(app, amqpEndpoint, MessagingQueue.KRATOS_EVENTS);
    connectMicroservice(app, amqpEndpoint, MessagingQueue.WHITEBOARDS);
    connectMicroservice(app, amqpEndpoint, MessagingQueue.FILES);
    connectMicroservice(app, amqpEndpoint, MessagingQueue.IN_APP_NOTIFICATIONS);
    connectMicroservice(
      app,
      amqpEndpoint,
      MessagingQueue.COLLABORATION_DOCUMENT_SERVICE
    );
  }
  // Note: Push notifications use @golevelup/nestjs-rabbitmq @RabbitSubscribe decorators
  // in PushDeliveryService. No NestJS microservice connection needed — a competing
  // Transport.RMQ consumer would steal messages from the golevelup handler.
  //
  // Matrix Adapter events also use @golevelup/nestjs-rabbitmq @RabbitSubscribe decorators
  // which are compatible with the Go Matrix Adapter's Watermill publishing.
  // No NestJS microservice connection needed for Matrix Adapter queue.
  await app.startAllMicroservices();
};

const connectMicroservice = (
  app: INestApplication,
  amqpEndpoint: string,
  queue: MessagingQueue | string
) => {
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
      //be careful with this flag, if set to true, message acknowledgment will be automatic. Double acknowledgment throws an error and disconnects the queue.
      noAck: false,
    },
  });
};

bootstrap();
