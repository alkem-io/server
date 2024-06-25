import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RolesVirtualContributorInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID of the VC to retrieve the roles of.',
  })
  virtualContributorID!: string;
}
