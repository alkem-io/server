import { RoleName } from '@common/enums/role.name';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignPlatformRoleToUserInput {
  @Field(() => UUID, { nullable: false })
  userID!: string;

  @Field(() => RoleName, { nullable: false })
  role!: RoleName;
}
