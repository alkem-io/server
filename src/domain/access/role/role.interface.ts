import { CommunityRoleType } from '@common/enums/community.role';
import { IBaseAlkemio } from '@domain/common/entity/base-entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Role')
export abstract class IRole extends IBaseAlkemio {
  @Field(() => CommunityRoleType, {
    nullable: false,
    description: 'The CommunityRole that this role definition is for.',
  })
  type!: CommunityRoleType;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag to indicate if this Role requires the Base role to be held.',
  })
  requiresBaseRole!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag to indicate if this Role requires having the same role in the Parent RoleManager.',
  })
  requiresParentRole!: boolean;

  credential!: string;

  parentCredentials!: string;

  userPolicy!: string;
  organizationPolicy!: string;
  virtualContributorPolicy!: string;
}
