import { RoleName } from '@common/enums/role.name';
import { IBaseAlkemio } from '@domain/common/entity/base-entity/base.alkemio.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Role')
export abstract class IRole extends IBaseAlkemio {
  @Field(() => RoleName, {
    nullable: false,
    description: 'The CommunityRole that this role definition is for.',
  })
  type!: RoleName;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag to indicate if this Role requires the entry level role to be held.',
  })
  requiresEntryRole!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Flag to indicate if this Role requires having the same role in the Parent RoleSet.',
  })
  requiresSameRoleInParentRoleSet!: boolean;

  credential!: string;

  parentCredentials!: string;

  userPolicy!: string;
  organizationPolicy!: string;
  virtualContributorPolicy!: string;
}
