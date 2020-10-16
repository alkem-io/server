import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { IServiceConfig } from './interfaces/service.config.interface';
import { BootstrapService } from './utils/bootstrap/bootstrap.service';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'log', 'warn', 'debug', 'verbose'],
  });

  const bootstrapService: BootstrapService = app.get(BootstrapService);
  await bootstrapService.bootstrapEcoverse();
  const configService: ConfigService = app.get(ConfigService);
  app.enableCors({
    origin: configService.get<IServiceConfig>('service')?.corsOrigin,
  });

  await app.listen(
    configService.get<IServiceConfig>('service')?.graphqlEndpointPort as number
  );
};

bootstrap();
