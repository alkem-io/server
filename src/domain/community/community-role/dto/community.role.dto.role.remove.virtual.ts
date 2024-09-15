import { CommunityRoleType } from '@common/enums/community.role';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveCommunityRoleFromVirtualInput {
  @Field(() => UUID, { nullable: false })
  roleManagerID!: string;

  @Field(() => UUID_NAMEID, { nullable: false })
  virtualContributorID!: string;

  @Field(() => CommunityRoleType, { nullable: false })
  role!: CommunityRoleType;
}
