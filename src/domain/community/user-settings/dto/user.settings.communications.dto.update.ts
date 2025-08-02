import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean } from 'class-validator';

@InputType()
export class UpdateUserSettingsCommunicationInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Allow Users to send messages to this User.',
  })
  @IsBoolean()
  allowOtherUsersToSendMessages?: boolean;
}
