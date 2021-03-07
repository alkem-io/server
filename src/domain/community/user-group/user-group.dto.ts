import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ProfileInput } from '@domain/community/profile/profile.dto';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';

@InputType()
export class UserGroupInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => ProfileInput, { nullable: true })
  profileData?: ProfileInput;
}
