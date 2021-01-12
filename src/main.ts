import './config/aliases';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionsFilter } from './utils/error-handling/http.exceptions.filter';
import { IServiceConfig } from './interfaces/service.config.interface';
import { BootstrapService } from './utils/bootstrap/bootstrap.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { faviconMiddleware } from './utils/middleware/favicon.middleware';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  const configService: ConfigService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  const bootstrapService: BootstrapService = app.get(BootstrapService);

  app.useLogger(logger);
  app.useGlobalFilters(new HttpExceptionsFilter(logger));
  app.useGlobalPipes(new ValidationPipe());
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

  await app.listen(
    configService.get<IServiceConfig>('service')?.graphqlEndpointPort as number
  );
};

bootstrap();
