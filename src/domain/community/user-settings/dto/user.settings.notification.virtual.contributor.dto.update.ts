import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateUserSettingsNotificationVirtualContributorInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Receive notification when a Virtual Contributor receives an invitation to join a Space.',
  })
  invitedToSpace?: boolean;
}
