import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ProfileInput } from '@domain/profile/profile.dto';

@InputType()
export class UserGroupInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;

  @Field(() => ProfileInput, { nullable: true })
  profileData?: ProfileInput;
}
