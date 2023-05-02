import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class InnovationHubArgsQuery {
  @Field(() => String, {
    nullable: true,
    description: 'The subdomain associated with the Innovation Hub',
  })
  subdomain?: string;
}
