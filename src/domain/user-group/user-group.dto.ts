import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ProfileInput } from '@domain/profile/profile.dto';
import { SMALL_TEXT_LENGTH } from '@constants';

@InputType()
export class UserGroupInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => ProfileInput, { nullable: true })
  profileData?: ProfileInput;
}
