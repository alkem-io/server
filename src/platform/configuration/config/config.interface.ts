import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthenticationConfig } from './authentication';
import { IPlatformLocations } from './locations';
import { ISentryConfig } from './sentry';
import { Template, ITemplate } from './template';
import { IApmConfig } from './apm';
import { IGeoConfig } from './integrations';
import { IStorageConfig } from './storage';
import { IPlatformFeatureFlag } from '../feature-flag/platform.feature.flag.interface';

@ObjectType('Config')
export abstract class IConfig {
  @Field(() => IAuthenticationConfig, {
    nullable: false,
    description: 'Authentication configuration.',
  })
  authentication?: IAuthenticationConfig;

  @Field(() => Template, {
    nullable: false,
    description: 'Alkemio template configuration.',
  })
  template?: ITemplate;

  @Field(() => IPlatformLocations, {
    nullable: false,
    description: 'Platform related locations.',
  })
  locations?: IPlatformLocations;

  @Field(() => [IPlatformFeatureFlag], {
    nullable: false,
    description: 'The feature flags for the platform',
  })
  featureFlags?: IPlatformFeatureFlag[];

  @Field(() => ISentryConfig, {
    nullable: false,
    description: 'Sentry (client monitoring) related configuration.',
  })
  sentry?: ISentryConfig;

  @Field(() => IApmConfig, {
    nullable: false,
    description:
      'Elastic APM (RUM & performance monitoring) related configuration.',
  })
  apm?: IApmConfig;

  @Field(() => IStorageConfig, {
    nullable: false,
    description: 'Configuration for storage providers, e.g. file',
  })
  storage?: IStorageConfig;

  @Field(() => IGeoConfig, {
    nullable: false,
    description: 'Integration with a 3rd party Geo information service',
  })
  geo?: IGeoConfig;
}
