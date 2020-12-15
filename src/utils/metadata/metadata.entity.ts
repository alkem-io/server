import { ObjectType, Field } from '@nestjs/graphql';
import { ClientMetadata } from './client-metadata/client.metadata.entity';
import { IClientMetadata } from './client-metadata/client.metadata.interface';
import { IMetadata } from './metadata.interface';
import { ServerMetadata } from './server-metadata/server.metadata.entity';
import { IServerMetadata } from './server-metadata/server.metadata.interface';

@ObjectType()
export class Metadata implements IMetadata {
  @Field(() => ServerMetadata, {
    nullable: false,
    description: 'Cherrytwist API Server Metadata.',
  })
  serverMetadata?: IServerMetadata;

  @Field(() => ClientMetadata, {
    nullable: false,
    description: 'Cherrytwist Web Client Metadata.',
  })
  clientMetadata?: IClientMetadata;
}
