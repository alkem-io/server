import { ICommunity } from '@domain/community/community/community.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';
import { PlatformRole } from '@common/enums/platform.role';
import { IPlatform } from '@platform/platfrom/platform.interface';

@ObjectType('PlatformInvitation')
export class IPlatformInvitation extends IAuthorizable {
  @Field(() => String, {
    description: 'The email address of the external user being invited',
  })
  email!: string;

  @Field(() => String)
  firstName!: string;

  @Field(() => String)
  lastName!: string;

  @Field(() => Boolean, {
    description: 'Whether a new user profile has been created.',
  })
  profileCreated!: boolean;

  @Field(() => String, { nullable: true })
  welcomeMessage?: string;

  createdBy!: string;

  @Field(() => Date)
  createdDate!: Date;

  community?: ICommunity;

  platform?: IPlatform;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether to also add the invited user to the parent community.',
  })
  communityInvitedToParent!: boolean;

  @Field(() => PlatformRole, {
    nullable: true,
    description: 'The platform role the user will receive when they sign up',
  })
  platformRole?: PlatformRole;
}
