import { RoleType } from '@common/enums/role.type';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveOrganizationRoleFromUserInput {
  @Field(() => UUID, { nullable: false })
  organizationID!: string;

  @Field(() => UUID, { nullable: false })
  userID!: string;

  @Field(() => RoleType, { nullable: false })
  role!: RoleType;
}
