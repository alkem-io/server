import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RolesVirtualContributorInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The ID or nameID of the VC to retrieve the roles of.',
  })
  virtualContributorID!: string;
}
