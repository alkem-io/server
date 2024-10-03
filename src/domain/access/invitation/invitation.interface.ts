import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { IRoleSet } from '@domain/access/role-set';
import { CommunityRoleType } from '@common/enums/community.role';

@ObjectType('Invitation')
export class IInvitation extends IAuthorizable {
  invitedContributor!: string;
  createdBy!: string;

  roleSet?: IRoleSet;

  @Field(() => ILifecycle, { nullable: false })
  lifecycle!: ILifecycle;

  @Field(() => Date)
  createdDate!: Date;

  @Field(() => Date)
  updatedDate!: Date;

  @Field(() => String, { nullable: true })
  welcomeMessage?: string;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether to also add the invited contributor to the parent community.',
  })
  invitedToParent!: boolean;

  @Field(() => CommunityContributorType, {
    nullable: false,
    description: 'The type of contributor that is invited.',
  })
  contributorType!: CommunityContributorType;

  @Field(() => CommunityRoleType, {
    nullable: true,
    description:
      'An additional role to assign to the Contributor, in addition to the entry Role.',
  })
  extraRole?: CommunityRoleType;
}
