import { Field, InputType } from '@nestjs/graphql';
import { CreateUserSettingsNotificationChannelsInput } from './user.settings.notification.dto.channels.create';

@InputType()
export class CreateUserSettingsNotificationVirtualContributorInput {
  @Field(() => CreateUserSettingsNotificationChannelsInput, {
    nullable: false,
    description:
      'Receive notification when a Virtual Contributor receives an invitation to join a Space.',
  })
  adminSpaceCommunityInvitation!: CreateUserSettingsNotificationChannelsInput;
}
