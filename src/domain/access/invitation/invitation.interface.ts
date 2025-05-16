import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { IRoleSet } from '@domain/access/role-set';
import { RoleName } from '@common/enums/role.name';

@ObjectType('Invitation')
export class IInvitation extends IAuthorizable {
  invitedContributorID!: string;
  createdBy!: string;

  roleSet?: IRoleSet;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle!: ILifecycle;

  @Field(() => String, { nullable: true })
  welcomeMessage?: string;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether to also add the invited contributor to the parent community.',
  })
  invitedToParent!: boolean;

  @Field(() => RoleSetContributorType, {
    nullable: false,
    description: 'The type of contributor that is invited.',
  })
  contributorType!: RoleSetContributorType;

  @Field(() => RoleName, {
    nullable: true,
    description:
      'An additional role to assign to the Contributor, in addition to the entry Role.',
  })
  extraRole?: RoleName;
}
