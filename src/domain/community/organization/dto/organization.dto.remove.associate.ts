import { UUID_NAMEID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveOrganizationAssociateInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  organizationID!: string;

  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;
}
