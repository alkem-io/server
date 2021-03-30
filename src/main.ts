import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import './config/aliases';
import { IServiceConfig } from './common/interfaces/service.config.interface';
import { BootstrapService } from './core/bootstrap/bootstrap.service';
import { HttpExceptionsFilter } from './core/error-handling/http.exceptions.filter';
import { faviconMiddleware } from './core/middleware/favicon.middleware';
import { useContainer } from 'class-validator';
import { graphqlUploadExpress } from 'graphql-upload';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  const configService: ConfigService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  const bootstrapService: BootstrapService = app.get(BootstrapService);

  app.useLogger(logger);
  app.useGlobalFilters(new HttpExceptionsFilter(logger));
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await bootstrapService.bootstrapEcoverse();
  app.enableCors({
    origin: configService.get<IServiceConfig>('service')?.corsOrigin,
    allowedHeaders: configService.get<IServiceConfig>('service')
      ?.corsAllowedHeaders,
    methods: configService.get<IServiceConfig>('service')?.corsMethods,
  });

  app.use(faviconMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use(
    graphqlUploadExpress({
      maxFileSize: 2097152,
    })
  );

  await app.listen(
    configService.get<IServiceConfig>('service')?.graphqlEndpointPort as number
  );
};

bootstrap();
