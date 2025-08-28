import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, ValidateNested } from 'class-validator';
import { UpdateUserSettingsNotificationSpaceAdminInput } from './user.settings.notification.space.admin.dto.update';
import { Type } from 'class-transformer';

@InputType()
export class UpdateUserSettingsNotificationSpaceInput {
  @Field(() => UpdateUserSettingsNotificationSpaceAdminInput, {
    nullable: true,
    description: 'Settings related to Space Admin Notifications.',
  })
  @ValidateNested()
  @Type(() => UpdateUserSettingsNotificationSpaceAdminInput)
  admin?: UpdateUserSettingsNotificationSpaceAdminInput;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification for community updates',
  })
  @IsBoolean()
  communicationUpdates?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when a contribution is added',
  })
  @IsBoolean()
  collaborationCalloutContributionCreated?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive a notification when a comment is created on a contribution',
  })
  @IsBoolean()
  collaborationCalloutPostContributionComment?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when a comment is added to a Callout',
  })
  @IsBoolean()
  collaborationCalloutComment?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when a callout is published',
  })
  @IsBoolean()
  collaborationCalloutPublished?: boolean;
}
