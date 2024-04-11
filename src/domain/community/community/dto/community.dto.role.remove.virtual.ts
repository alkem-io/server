import { CommunityRole } from '@common/enums/community.role';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveCommunityRoleFromVirtualInput {
  @Field(() => UUID, { nullable: false })
  communityID!: string;

  @Field(() => UUID_NAMEID, { nullable: false })
  virtualContributorID!: string;

  @Field(() => CommunityRole, { nullable: false })
  role!: CommunityRole;
}
