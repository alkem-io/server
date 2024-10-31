import { PlatformRole } from '@common/enums/platform.role';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignPlatformRoleToUserInput {
  @Field(() => UUID, { nullable: false })
  userID!: string;

  @Field(() => PlatformRole, { nullable: false })
  role!: PlatformRole;
}
