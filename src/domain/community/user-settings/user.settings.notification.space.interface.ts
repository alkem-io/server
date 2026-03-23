import { Field, ObjectType } from '@nestjs/graphql';
import { IUserSettingsNotificationChannels } from './user.settings.notification.channels.interface';
import { IUserSettingsNotificationSpaceAdmin } from './user.settings.notification.space.admin.interface';

@ObjectType('UserSettingsNotificationSpace')
export abstract class IUserSettingsNotificationSpace {
  @Field(() => IUserSettingsNotificationSpaceAdmin, {
    nullable: false,
    description:
      'The notifications settings for Space Admin events for this User',
  })
  admin!: IUserSettingsNotificationSpaceAdmin;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification for community updates',
  })
  communicationUpdates!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a callout is published',
  })
  collaborationCalloutPublished!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a comment is made on a Callout',
  })
  collaborationCalloutComment!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a contribution is created',
  })
  collaborationCalloutContributionCreated!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a comment is created on a Post contribution',
  })
  collaborationCalloutPostContributionComment!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a calendar event is created',
  })
  communityCalendarEvents!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a vote is cast on a poll you created',
  })
  collaborationPollVoteCastOnOwnPoll!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when another user votes on a poll you already voted on',
  })
  collaborationPollVoteCastOnPollIVotedOn!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description: 'Receive a notification when a poll you voted on is modified',
  })
  collaborationPollModifiedOnPollIVotedOn!: IUserSettingsNotificationChannels;

  @Field(() => IUserSettingsNotificationChannels, {
    nullable: false,
    description:
      'Receive a notification when a poll option you voted for is changed or removed',
  })
  collaborationPollVoteAffectedByOptionChange!: IUserSettingsNotificationChannels;
}
