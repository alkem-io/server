import { ObjectType, Field } from '@nestjs/graphql';
import { IServerMetadata } from './server.metadata.interface';

@ObjectType()
export class ServerMetadata implements IServerMetadata {
  @Field(() => String, {
    nullable: false,
    description:
      'Cherrytwist Server version in the format {major.minor.patch} - using SemVer.',
  })
  version?: string;
}
