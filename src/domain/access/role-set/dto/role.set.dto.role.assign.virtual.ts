import { CommunityRoleType } from '@common/enums/community.role';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignCommunityRoleToVirtualInput {
  @Field(() => UUID, { nullable: false })
  roleSetID!: string;

  @Field(() => UUID_NAMEID, { nullable: false })
  virtualContributorID!: string;

  @Field(() => CommunityRoleType, { nullable: false })
  role!: CommunityRoleType;
}
