import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateUserSettingsNotificationSpaceAdminInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive a notification when a message is sent to a Space I lead',
  })
  @IsBoolean()
  communicationMessageReceived?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when an application is received',
  })
  @IsBoolean()
  communityApplicationReceived?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive a notification when a new member joins the community (admin)',
  })
  @IsBoolean()
  communityNewMember?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when a contribution is added (admin)',
  })
  @IsBoolean()
  collaborationCalloutContributionCreated?: boolean;
}
