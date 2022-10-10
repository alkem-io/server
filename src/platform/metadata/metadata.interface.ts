import { INVP } from '@domain/common/nvp';
import { Field, ObjectType } from '@nestjs/graphql';
import { IServiceMetadata } from './service';

@ObjectType('Metadata')
export abstract class IMetadata {
  @Field(() => [IServiceMetadata], {
    nullable: false,
    description: 'Collection of metadata about Alkemio services.',
  })
  services?: IServiceMetadata[];

  @Field(() => [INVP], {
    nullable: false,
    description: 'Metrics about the activity on the platform',
  })
  metrics?: INVP[];
}
