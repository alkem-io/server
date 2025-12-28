import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import './config/aliases';
import { BootstrapService } from '@core/bootstrap';
import { faviconMiddleware } from '@core/middleware';
import { useContainer } from 'class-validator';
import { graphqlUploadExpress } from 'graphql-upload';
import { MessagingQueue } from '@common/enums';
import { json } from 'body-parser';
import cookieParser from 'cookie-parser';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { INestApplication } from '@nestjs/common';
import { AlkemioConfig } from '@src/types';
import { renderGraphiQL } from 'graphql-helix';
import { Request, Response } from 'express';

// this is used - it needs to start before the app
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { apmAgent } from './apm';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, {
    /***
     * if the logger is provided at a later stage via 'useLogger' after the app has initialized, Nest falls back to the default logger
     * while initializing, which logs a lot of info logs, which we don't have control over and don't want tracked.
     * The logger is disabled while the app is loading ONLY on production to avoid the messages;
     * then the costume logger is applied as usual
     */
    logger: process.env.NODE_ENV === 'production' ? false : undefined,
  });
  const configService: ConfigService<AlkemioConfig, true> =
    app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  const bootstrapService: BootstrapService = app.get(BootstrapService);

  app.useLogger(logger);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await bootstrapService.bootstrap();
  const { enabled, methods, origin, allowed_headers } = configService.get(
    'security.cors',
    { infer: true }
  );
  if (enabled) {
    app.enableCors({
      origin,
      allowedHeaders: allowed_headers,
      methods,
    });
  }

  app.use(faviconMiddleware);
  app.use(cookieParser());
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

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
  app.use(
    json({
      limit: max_json_payload_size,
    })
  );

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
  connectMicroservice(app, amqpEndpoint, MessagingQueue.AUTH_RESET);
  connectMicroservice(app, amqpEndpoint, MessagingQueue.WHITEBOARDS);
  connectMicroservice(app, amqpEndpoint, MessagingQueue.FILES);
  connectMicroservice(app, amqpEndpoint, MessagingQueue.IN_APP_NOTIFICATIONS);
  connectMicroservice(
    app,
    amqpEndpoint,
    MessagingQueue.COLLABORATION_DOCUMENT_SERVICE
  );
  // Note: Matrix Adapter events use @golevelup/nestjs-rabbitmq @RabbitSubscribe decorators
  // which are compatible with the Go Matrix Adapter's Watermill publishing.
  // No NestJS microservice connection needed for Matrix Adapter queue.
  await app.startAllMicroservices();
};

const connectMicroservice = (
  app: INestApplication,
  amqpEndpoint: string,
  queue: MessagingQueue
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
