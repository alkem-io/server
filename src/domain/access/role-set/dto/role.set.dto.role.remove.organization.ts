import { RoleName } from '@common/enums/role.name';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveRoleOnRoleSetFromOrganizationInput {
  @Field(() => UUID, { nullable: false })
  roleSetID!: string;

  @Field(() => UUID, { nullable: false })
  contributorID!: string;

  @Field(() => RoleName, { nullable: false })
  role!: RoleName;
}
