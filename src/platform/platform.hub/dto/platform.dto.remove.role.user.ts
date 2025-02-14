import { RoleName } from '@common/enums/role.name';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemovePlatformRoleFromUserInput {
  @Field(() => UUID, { nullable: false })
  userID!: string;

  @Field(() => RoleName, { nullable: false })
  role!: RoleName;
}
