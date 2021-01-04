import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionsFilter } from './utils/error-handling/http.exceptions.filter';
import { IServiceConfig } from './interfaces/service.config.interface';
import { BootstrapService } from './utils/bootstrap/bootstrap.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { faviconMiddleware } from './utils/middleware/favicon.middleware';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);
  const configService: ConfigService = app.get(ConfigService);
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  const bootstrapService: BootstrapService = app.get(BootstrapService);

  app.useLogger(logger);
  app.useGlobalFilters(new HttpExceptionsFilter(logger, configService));
  await bootstrapService.bootstrapEcoverse();
  app.enableCors({
    origin: configService.get<IServiceConfig>('service')?.corsOrigin,
  });

  app.use(faviconMiddleware);

  await app.listen(
    configService.get<IServiceConfig>('service')?.graphqlEndpointPort as number
  );
};

bootstrap();
