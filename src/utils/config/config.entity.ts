import { ObjectType, Field } from '@nestjs/graphql';
import { IConfig } from './config.interface';
import { ITemplate } from './template/template.interface';
import { Template } from './template/template.entity';
import { AuthenticationProvidersConfig } from './authentication-providers/authentication.providers.config.entity';
import { IAuthenticationProvidersConfig } from './authentication-providers/authentication.providers.config.interface';

@ObjectType()
export class Config implements IConfig {
  @Field(() => AuthenticationProvidersConfig, {
    nullable: false,
    description: 'Cherrytwist Authentication Providers Config.',
  })
  authenticationProviders?: IAuthenticationProvidersConfig;

  @Field(() => Template, {
    nullable: false,
    description: 'Cherrytwist Template.',
  })
  template?: ITemplate;
}
