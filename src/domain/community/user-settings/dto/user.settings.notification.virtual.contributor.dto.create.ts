import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateUserSettingsNotificationVirtualContributorInput {
  @Field(() => Boolean, {
    nullable: false,
    description:
      'Receive notification when a Virtual Contributor receives an invitation to join a Space.',
  })
  adminSpaceCommunityInvitation!: boolean;
}
