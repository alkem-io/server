import { ArgsType, Field } from '@nestjs/graphql';
import { UUID_NAMEID } from '@domain/common/scalars';

@ArgsType()
export class InnovationHubArgsQuery {
  @Field(() => String, {
    nullable: true,
    description: 'The subdomain associated with the Innovation Hub',
  })
  subdomain?: string;

  @Field(() => UUID_NAMEID, {
    nullable: true,
    description: 'The ID or nameID of the Innovation Hub',
  })
  id?: string;
}
