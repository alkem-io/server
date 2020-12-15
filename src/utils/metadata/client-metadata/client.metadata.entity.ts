import { ObjectType, Field } from '@nestjs/graphql';
import { AadConfig } from './aad-config/aad.config.entity';
import { IAadConfig } from './aad-config/aad.config.interface';
import { IClientMetadata } from './client.metadata.interface';
import { UxTemplate } from './template/template.entity';
import { IUxTemplate } from './template/template.interface';

@ObjectType()
export class ClientMetadata implements IClientMetadata {
  @Field(() => UxTemplate, {
    nullable: false,
    description: 'Cherrytwist Client UX template.',
  })
  template?: IUxTemplate;

  @Field(() => AadConfig, {
    nullable: false,
    description: 'Cherrytwist Client AAD config.',
  })
  aadConfig?: IAadConfig;
}
