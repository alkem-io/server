import { LONG_TEXT_LENGTH } from '@common/constants';
import { Field, InputType } from '@nestjs/graphql';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

@InputType()
export class SubscribeToPushNotificationsInput {
  @Field(() => String, {
    description: 'The push service endpoint URL from PushSubscription.endpoint',
  })
  @IsUrl({ require_tld: false }, { message: 'endpoint must be a valid URL' })
  @MaxLength(LONG_TEXT_LENGTH)
  endpoint!: string;

  @Field(() => String, {
    description:
      "The p256dh key from PushSubscription.getKey('p256dh'), Base64URL-encoded",
  })
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @Field(() => String, {
    description:
      "The auth key from PushSubscription.getKey('auth'), Base64URL-encoded",
  })
  @IsString()
  @IsNotEmpty()
  auth!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Optional browser/device user agent for display in subscription management UI',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;
}
