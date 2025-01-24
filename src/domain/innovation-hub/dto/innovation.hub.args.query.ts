import { ArgsType, Field } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';

@ArgsType()
export class InnovationHubArgsQuery {
  @Field(() => String, {
    nullable: true,
    description: 'The subdomain associated with the Innovation Hub',
  })
  subdomain?: string;

  @Field(() => UUID, {
    nullable: true,
    description: 'The ID of the Innovation Hub',
  })
  id?: string;
}
