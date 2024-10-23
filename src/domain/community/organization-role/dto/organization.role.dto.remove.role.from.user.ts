import { OrganizationRole } from '@common/enums/organization.role';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveOrganizationRoleFromUserInput {
  @Field(() => UUID, { nullable: false })
  organizationID!: string;

  @Field(() => UUID, { nullable: false })
  userID!: string;

  @Field(() => OrganizationRole, { nullable: false })
  role!: OrganizationRole;
}
