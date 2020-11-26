import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './exceptions.filter';
import { IServiceConfig } from './interfaces/service.config.interface';
import { BootstrapService } from './utils/bootstrap/bootstrap.service';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new AllExceptionsFilter());
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
