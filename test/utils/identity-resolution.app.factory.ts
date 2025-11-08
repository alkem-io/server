import { INestApplication, ModuleMetadata, ValidationPipe } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { HttpExceptionFilter } from '@core/error-handling/http.exception.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

export interface IdentityResolutionAppFactoryOptions
  extends Pick<ModuleMetadata, 'imports' | 'providers' | 'controllers'> {
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}

/**
 * Builds a Nest testing application tailored for the identity-resolution REST module.
 * Tests can provide their own module metadata and override dependencies through the configure hook.
 */
export const createIdentityResolutionTestApp = async (
  options: IdentityResolutionAppFactoryOptions
): Promise<INestApplication> => {
  const builder = Test.createTestingModule({
    imports: options.imports ?? [],
    controllers: options.controllers ?? [],
    providers: options.providers ?? [],
  });

  const configuredBuilder = options.configure
    ? options.configure(builder)
    : builder;

  const moduleRef = await configuredBuilder.compile();
  const app = moduleRef.createNestApplication();

  // Register the HTTP exception filter
  const logger = moduleRef.get(WINSTON_MODULE_NEST_PROVIDER);
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
      forbidNonWhitelisted: false,
    })
  );

  await app.init();
  return app;
};
