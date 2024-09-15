import { CommunityRoleType } from '@common/enums/community.role';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveCommunityRoleFromOrganizationInput {
  @Field(() => UUID, { nullable: false })
  communityID!: string;

  @Field(() => UUID_NAMEID, { nullable: false })
  organizationID!: string;

  @Field(() => CommunityRoleType, { nullable: false })
  role!: CommunityRoleType;
}
