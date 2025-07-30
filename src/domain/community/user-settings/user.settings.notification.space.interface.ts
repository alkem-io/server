import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsNotificationSpace    ')
export abstract class IUserSettingsNotificationSpace {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when an application is received',
  })
  applicationReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when an application is submitted',
  })
  applicationSubmitted!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification for community updates',
  })
  communicationUpdates!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification for community updates as Admin',
  })
  communicationUpdatesAdmin!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a new member joins the community',
  })
  communityNewMember!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  communityNewMemberAdmin!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification for community invitation',
  })
  communityInvitationUser!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a post is created (admin)',
  })
  postCreatedAdmin!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a post is created',
  })
  postCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a comment is created on a post',
  })
  postCommentCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a whiteboard is created',
  })
  whiteboardCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a callout is published',
  })
  calloutPublished!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when mentioned in communication',
  })
  communicationMention!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when someone replies to your comment',
  })
  commentReply!: boolean;
}
