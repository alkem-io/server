import { PlatformRole } from '@common/enums/platform.role';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars/scalar.uuid.nameid.email';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignPlatformRoleToUserInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;

  @Field(() => PlatformRole, { nullable: false })
  role!: PlatformRole;
}
