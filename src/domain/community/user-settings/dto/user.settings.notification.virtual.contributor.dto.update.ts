import { Field, InputType } from '@nestjs/graphql';
import { ValidateNested } from 'class-validator';
import { NotificationSettingInput } from './notification.setting.input';
import { Type } from 'class-transformer';

@InputType()
export class UpdateUserSettingsNotificationVirtualContributorInput {
  @Field(() => NotificationSettingInput, {
    nullable: true,
    description:
      'Receive notification when a Virtual Contributor receives an invitation to join a Space.',
  })
  @ValidateNested()
  @Type(() => NotificationSettingInput)
  adminSpaceCommunityInvitation?: NotificationSettingInput;
}
