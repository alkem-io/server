import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateUserSettingsNotificationUserMembershipInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when an application is submitted',
  })
  @IsBoolean()
  spaceCommunityApplicationSubmitted?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification for community invitation',
  })
  @IsBoolean()
  spaceCommunityInvitationReceived?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Receive a notification when I join a new community',
  })
  @IsBoolean()
  spaceCommunityJoined?: boolean;
}
