import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { CreateProfileInput } from '@domain/community/profile';

@InputType()
export class CreateUserGroupInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => CreateProfileInput, { nullable: true })
  profileData?: CreateProfileInput;
}
