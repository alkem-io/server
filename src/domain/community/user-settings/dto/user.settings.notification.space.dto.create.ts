import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class CreateUserSettingsNotificationSpaceInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a message is sent to a Space I lead',
  })
  @IsBoolean()
  adminCommunicationMessage!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when an application is received',
  })
  @IsBoolean()
  adminCommunityApplicationReceived!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  @IsBoolean()
  adminCommunityNewMember!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a contribution is added (admin)',
  })
  @IsBoolean()
  adminCollaborationCalloutContribution!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification for community updates',
  })
  @IsBoolean()
  communicationUpdates!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a contribution is added',
  })
  @IsBoolean()
  collaborationContributionCreated!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive a notification when a comment is created on a contribution',
  })
  @IsBoolean()
  collaborationCalloutContributionComment!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a comment is added to a Callout',
  })
  @IsBoolean()
  collaborationCalloutComment!: boolean;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Receive a notification when a callout is published',
  })
  @IsBoolean()
  collaborationCalloutPublished!: boolean;
}
