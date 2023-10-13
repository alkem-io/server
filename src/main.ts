import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import './config/aliases';
import { BootstrapService } from './core/bootstrap/bootstrap.service';
import { faviconMiddleware } from './core/middleware/favicon.middleware';
import { useContainer } from 'class-validator';
import { graphqlUploadExpress } from 'graphql-upload';
import { ConfigurationTypes, MessagingQueue } from '@common/enums';
import { json } from 'body-parser';
import cookieParser from 'cookie-parser';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

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
  const configService: ConfigService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  const bootstrapService: BootstrapService = app.get(BootstrapService);

  app.useLogger(logger);
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await bootstrapService.bootstrap();
  const corsEnabled = configService.get(ConfigurationTypes.SECURITY).cors
    .enabled;
  if (corsEnabled) {
    app.enableCors({
      origin: configService.get(ConfigurationTypes.SECURITY)?.cors?.origin,
      allowedHeaders: configService.get(ConfigurationTypes.SECURITY)?.cors
        ?.allowed_headers,
      methods: configService.get(ConfigurationTypes.SECURITY)?.cors?.methods,
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
      maxFileSize: configService.get(ConfigurationTypes.STORAGE)?.file
        ?.max_file_size,
    })
  );

  app.use(
    json({
      limit: configService.get(ConfigurationTypes.HOSTING)
        ?.max_json_payload_size,
    })
  );

  await app.listen(
    configService.get(ConfigurationTypes.HOSTING)?.port as number
  );

  const connectionOptions = configService.get(ConfigurationTypes.MICROSERVICES)
    ?.rabbitmq?.connection;

  const amqpEndpoint = `amqp://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}?heartbeat=30`;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [amqpEndpoint],
      queue: MessagingQueue.AUTH_RESET,
      queueOptions: {
        durable: true,
      },
      //be careful with this flag, if set to true, message acknowledgment will be automatic. Double acknowledgment throws an error and disconnects the queue.
      noAck: false,
    },
  });
  await app.startAllMicroservices();
};

bootstrap();
