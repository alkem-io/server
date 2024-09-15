import { CommunityRoleType } from '@common/enums/community.role';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignCommunityRoleToOrganizationInput {
  @Field(() => UUID, { nullable: false })
  roleManagerID!: string;

  @Field(() => UUID_NAMEID, { nullable: false })
  organizationID!: string;

  @Field(() => CommunityRoleType, { nullable: false })
  role!: CommunityRoleType;
}
