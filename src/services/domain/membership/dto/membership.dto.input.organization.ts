import { UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class MembershipOrganizationInput {
  @Field(() => UUID_NAMEID, {
    nullable: false,
    description: 'The ID of the organization to retrieve the membership of.',
  })
  organizationID!: string;
}
