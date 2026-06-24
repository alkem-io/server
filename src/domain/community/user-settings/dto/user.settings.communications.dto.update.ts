import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class UpdateUserSettingsCommunicationInput {
  @Field(() => Boolean, {
    nullable: true,
    description: 'Allow Users to send messages to this User.',
  })
  @IsOptional()
  @IsBoolean()
  allowOtherUsersToSendMessages?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Allow other Users to be offered an email contact route to this User (using the account email; the address is never exposed).',
  })
  @IsOptional()
  @IsBoolean()
  allowOtherUsersToContactViaEmail?: boolean;
}
