import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class CreateUserSettingsNotificationSpaceInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when an application is received',
  })
  @IsBoolean()
  communityApplicationReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when an application is submitted',
  })
  @IsBoolean()
  communityApplicationSubmitted!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification for community updates',
  })
  @IsBoolean()
  communicationUpdates!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification for community updates',
  })
  @IsBoolean()
  communicationUpdatesAdmin!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a new member joins the community',
  })
  @IsBoolean()
  communityNewMember!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  @IsBoolean()
  communityNewMemberAdmin!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification for community invitation',
  })
  @IsBoolean()
  communityInvitationUser!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a post is created (admin)',
  })
  @IsBoolean()
  collaborationPostCreatedAdmin!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a post is created',
  })
  @IsBoolean()
  collaborationPostCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a comment is created on a post',
  })
  @IsBoolean()
  collaborationPostCommentCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a whiteboard is created',
  })
  @IsBoolean()
  collaborationWhiteboardCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a callout is published',
  })
  @IsBoolean()
  collaborationCalloutPublished!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a copy of messages that I send to a Space',
  })
  @IsBoolean()
  communicationMessage!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a message is sent to a Space I lead',
  })
  @IsBoolean()
  communicationMessageAdmin!: boolean;
}
