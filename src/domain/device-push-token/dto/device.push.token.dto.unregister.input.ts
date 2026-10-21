import { MID_TEXT_LENGTH } from '@common/constants';
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class UnregisterDevicePushTokenInput {
  @Field(() => String, {
    description: 'The native push token to unbind from the current user.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MID_TEXT_LENGTH)
  token!: string;
}
