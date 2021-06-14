import { ObjectType, Field } from '@nestjs/graphql';
import { IConfig } from './config.interface';
import { ITemplate } from './template/template.interface';
import { Template } from './template/template.entity';
import { AuthenticationConfig } from './authentication/authentication.config.entity';
import { IAuthenticationConfig } from './authentication/authentication.config.interface';

@ObjectType()
export class Config implements IConfig {
  @Field(() => AuthenticationConfig, {
    nullable: false,
    description: 'Cherrytwist authentication configuration.',
  })
  authentication?: IAuthenticationConfig;

  @Field(() => Template, {
    nullable: false,
    description: 'Cherrytwist template configuration.',
  })
  template?: ITemplate;
}
