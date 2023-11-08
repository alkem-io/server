import { Field, ObjectType } from '@nestjs/graphql';
import { IServiceMetadata } from './service';

@ObjectType('Metadata')
export abstract class IMetadata {
  @Field(() => [IServiceMetadata], {
    nullable: false,
    description: 'Collection of metadata about Alkemio services.',
  })
  services?: IServiceMetadata[];
}
