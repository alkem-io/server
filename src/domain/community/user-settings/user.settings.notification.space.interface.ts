import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsNotificationSpace')
export abstract class IUserSettingsNotificationSpace {
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
    description: 'Receive a notification when an application is received',
  })
  communityApplicationReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when an application is submitted',
  })
  communityApplicationSubmitted!: boolean;

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
    description: 'Receive a copy of messages that I send to a Space',
  })
  communicationMessage!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a message is sent to a Space I lead',
  })
  communicationMessageAdmin!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a post is created (admin)',
  })
  collaborationPostCreatedAdmin!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a post is created',
  })
  collaborationPostCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a comment is created on a post',
  })
  collaborationPostCommentCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a whiteboard is created',
  })
  collaborationWhiteboardCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a callout is published',
  })
  collaborationCalloutPublished!: boolean;
}
