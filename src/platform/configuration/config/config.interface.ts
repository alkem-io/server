import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthenticationConfig } from './authentication/authentication.config.interface';
import { IPlatformConfig } from './platform';
import { ISentryConfig } from './sentry';
import { Template } from './template/template.entity';
import { ITemplate } from './template/template.interface';

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
}
