import { OrganizationRole } from '@common/enums/organization.role';
import { UUID_NAMEID, UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveOrganizationRoleFromUserInput {
  @Field(() => UUID_NAMEID, { nullable: false })
  organizationID!: string;

  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;

  @Field(() => OrganizationRole, { nullable: false })
  role!: OrganizationRole;
}
