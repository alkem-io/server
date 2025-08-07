import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateUserSettingsNotificationSpaceInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when an application is received',
  })
  @IsBoolean()
  applicationReceived?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when an application is submitted',
  })
  @IsBoolean()
  applicationSubmitted?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification for community updates',
  })
  @IsBoolean()
  communicationUpdates?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification for community updates',
  })
  @IsBoolean()
  communicationUpdatesAdmin?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when a new member joins the community',
  })
  @IsBoolean()
  communityNewMember?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  @IsBoolean()
  communityNewMemberAdmin?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification for community invitation',
  })
  @IsBoolean()
  communityInvitationUser?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when a post is created (admin)',
  })
  @IsBoolean()
  postCreatedAdmin?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when a post is created',
  })
  @IsBoolean()
  postCreated?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when a comment is created on a post',
  })
  @IsBoolean()
  postCommentCreated?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when a whiteboard is created',
  })
  @IsBoolean()
  whiteboardCreated?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when a callout is published',
  })
  @IsBoolean()
  calloutPublished?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when mentioned in communication',
  })
  @IsBoolean()
  communicationMention?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when someone replies to your comment',
  })
  @IsBoolean()
  commentReply?: boolean;
}
