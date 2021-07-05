import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class MembershipOrganisationInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID of the organisation to retrieve the membership of.',
  })
  organisationID!: string;
}
