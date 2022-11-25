import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthenticationConfig } from './authentication';
import { IPlatformConfig } from './platform';
import { ISentryConfig } from './sentry';
import { Template, ITemplate } from './template';
import { IApmConfig } from './apm';
import { IStorageConfig } from './storage';
import { IGeoConfig } from './integrations';

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

  @Field(() => IPlatformConfig, {
    nullable: false,
    description: 'Platform related resources.',
  })
  platform?: IPlatformConfig;

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
