import { INVP } from '@domain/common/nvp';
import { ObjectType, Field } from '@nestjs/graphql';
import { IMetadata } from './metadata.interface';
import { ServiceMetadata } from './service/service.metadata.entity';
import { IServiceMetadata } from './service/service.metadata.interface';

@ObjectType()
export class Metadata implements IMetadata {
  @Field(() => [ServiceMetadata], {
    nullable: false,
    description: 'Collection of metadata about Cherrytwist services.',
  })
  services?: IServiceMetadata[];

  @Field(() => [INVP], {
    nullable: false,
    description: 'Metrics about the activity on the platform',
  })
  activity?: INVP[];
}
