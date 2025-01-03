import { RoleType } from '@common/enums/role.type';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveRoleOnRoleSetFromUserInput {
  @Field(() => UUID, { nullable: false })
  roleSetID!: string;

  @Field(() => UUID, { nullable: false })
  contributorID!: string;

  @Field(() => RoleType, { nullable: false })
  role!: RoleType;
}
