import { RoleName } from '@common/enums/role.name';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignPlatformRoleInput {
  @Field(() => UUID, { nullable: false })
  actorId!: string;

  @Field(() => RoleName, { nullable: false })
  role!: RoleName;
}
