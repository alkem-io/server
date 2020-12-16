import { ObjectType, Field } from '@nestjs/graphql';
import { AadConfig } from './aad-config/aad.config.entity';
import { IAadConfig } from './aad-config/aad.config.interface';
import { IWebClientConfig } from './web.client.config.interface';

@ObjectType()
export class WebClientConfig implements IWebClientConfig {
  @Field(() => AadConfig, {
    nullable: false,
    description: 'Cherrytwist Client AAD config.',
  })
  aadConfig?: IAadConfig;
}
