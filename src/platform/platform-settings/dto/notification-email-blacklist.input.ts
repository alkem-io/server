import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail } from 'class-validator';

@InputType()
export class NotificationEmailAddressInput {
  @Field(() => String, {
    description:
      'Full email address to add/remove; lowercase enforced by server',
  })
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  email!: string;
}
