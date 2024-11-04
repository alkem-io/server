import { PlatformRole } from '@common/enums/platform.role';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemovePlatformRoleFromUserInput {
  @Field(() => UUID, { nullable: false })
  userID!: string;

  @Field(() => PlatformRole, { nullable: false })
  role!: PlatformRole;
}
