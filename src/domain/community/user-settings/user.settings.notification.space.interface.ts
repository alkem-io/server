import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSettingsNotificationSpace')
export abstract class IUserSettingsNotificationSpace {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  adminCommunityNewMember!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when an application is received',
  })
  adminCommunityApplicationReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a message is sent to a Space I lead',
  })
  adminCommunicationMessageReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a contribution is created (admin)',
  })
  adminCollaborationContributionCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification for community updates',
  })
  communicationUpdates!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a callout is published',
  })
  collaborationCalloutPublished!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a comment is made on a Callout',
  })
  collaborationCalloutComment!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a contribution is created',
  })
  collaborationCalloutContributionCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a comment is created on a contribution',
  })
  collaborationCalloutContributionComment!: boolean;
}
