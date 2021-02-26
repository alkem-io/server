import { ObjectType, Field } from '@nestjs/graphql';
import { IConfig } from './config.interface';
import { ITemplate } from './template/template.interface';
import { Template } from './template/template.entity';
import { AuthenticationProviderConfig } from './authentication-providers/authentication.provider.config.entity';
import { IAuthenticationProviderConfig } from './authentication-providers/authentication.provider.config.interface';

@ObjectType()
export class Config implements IConfig {
  @Field(() => [AuthenticationProviderConfig], {
    nullable: false,
    description: 'Cherrytwist Authentication Providers Config.',
  })
  authenticationProviders?: IAuthenticationProviderConfig[];

  @Field(() => Template, {
    nullable: false,
    description: 'Cherrytwist Template.',
  })
  template?: ITemplate;
}
