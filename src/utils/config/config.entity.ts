import { ObjectType, Field } from '@nestjs/graphql';
import { IWebClientConfig } from './client/web.client.config.interface';
import { WebClientConfig } from './client/web.client.config.entity';
import { IConfig } from './config.interface';
import { ITemplate } from './template/template.interface';
import { Template } from './template/template.entity';

@ObjectType()
export class Config implements IConfig {
  @Field(() => WebClientConfig, {
    nullable: false,
    description: 'Cherrytwist Web Client Config.',
  })
  webClient?: IWebClientConfig;

  @Field(() => Template, {
    nullable: false,
    description: 'Cherrytwist Template.',
  })
  template?: ITemplate;
}
