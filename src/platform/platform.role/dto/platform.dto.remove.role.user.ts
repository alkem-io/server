import { PlatformRole } from '@common/enums/platform.role';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemovePlatformRoleFromUserInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;

  @Field(() => PlatformRole, { nullable: false })
  role!: PlatformRole;
}
