import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { IRoleManager } from '@domain/access/role-manager';

@ObjectType('Invitation')
export class IInvitation extends IAuthorizable {
  invitedContributor!: string;
  createdBy!: string;

  roleManager?: IRoleManager;

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
}
