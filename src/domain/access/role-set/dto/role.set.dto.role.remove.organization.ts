import { CommunityRoleType } from '@common/enums/community.role';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveRoleOnRoleSetFromOrganizationInput {
  @Field(() => UUID, { nullable: false })
  roleSetID!: string;

  @Field(() => UUID_NAMEID, { nullable: false })
  organizationID!: string;

  @Field(() => CommunityRoleType, { nullable: false })
  role!: CommunityRoleType;
}