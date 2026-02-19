import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

@InputType()
export class PushSubscriptionInput {
  @Field(() => String, {
    description: 'The push service endpoint URL.',
  })
  @IsUrl({}, { message: 'endpoint must be a valid URL' })
  @IsNotEmpty()
  endpoint!: string;

  @Field(() => String, {
    description: 'The p256dh key from the push subscription.',
  })
  @IsString()
  @IsNotEmpty()
  p256dh!: string;

  @Field(() => String, {
    description: 'The auth secret from the push subscription.',
  })
  @IsString()
  @IsNotEmpty()
  auth!: string;
}
