import { UUID_NAMEID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignOrganisationMemberInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  organisationID!: string;

  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;
}
