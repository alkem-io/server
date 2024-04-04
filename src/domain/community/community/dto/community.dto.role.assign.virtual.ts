import { CommunityRole } from '@common/enums/community.role';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignCommunityRoleToVirtualInput {
  @Field(() => UUID, { nullable: false })
  communityID!: string;

  @Field(() => UUID_NAMEID, { nullable: false })
  virtualID!: string;

  @Field(() => CommunityRole, { nullable: false })
  role!: CommunityRole;
}
