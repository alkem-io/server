import { MID_TEXT_LENGTH } from '@common/constants';
import { Field, InputType } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class RegisterDevicePushTokenInput {
  @Field(() => String, {
    description:
      'The native push token for this device (FCM registration token on Android, APNs device token on iOS).',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MID_TEXT_LENGTH)
  token!: string;

  // A String, not a GraphQL enum (D-1): `Capacitor.getPlatform()` already
  // returns exactly these two values, and an enum would buy a client-side
  // mapping plus a generated enum the page cannot have.
  @Field(() => String, {
    description: "The native platform of the device: 'ios' or 'android'.",
  })
  @IsString()
  @IsIn(['ios', 'android'])
  platform!: string;
}
