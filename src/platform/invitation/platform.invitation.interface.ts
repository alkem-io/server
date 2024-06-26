import { ICommunity } from '@domain/community/community/community.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity';

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

  community!: ICommunity;

  @Field(() => Date)
  createdDate!: Date;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether to also add the invited user to the parent community.',
  })
  invitedToParent!: boolean;
}
