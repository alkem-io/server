import { MID_TEXT_LENGTH } from '@common/constants';
import { Field, InputType } from '@nestjs/graphql';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

@InputType()
export class RegisterDevicePushTokenInput {
  @Field(() => String, {
    description:
      'The native push token for this device (FCM registration token on Android, APNs device token on iOS).',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MID_TEXT_LENGTH)
  // SEC-086-03. The value is interpolated into the APNs HTTP/2 `:path`, and a
  // token outside this charset earns a session-level protocol error instead of
  // a 400/410 verdict — so `deleteByToken` can never reclaim the row. Lossless:
  // APNs tokens are hex, FCM tokens are `[A-Za-z0-9_:.-]`. Owned ONLY here —
  // encoding at the sender too would turn a rejected shape into a failing one.
  @Matches(/^[A-Za-z0-9_:.~-]{32,512}$/)
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
