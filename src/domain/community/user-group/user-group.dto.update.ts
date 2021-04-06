import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UpdateProfileInput } from '@domain/community/profile';

@InputType()
export class UpdateUserGroupInput {
  @Field({ nullable: false })
  ID!: string;

  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => UpdateProfileInput, { nullable: true })
  profileData?: UpdateProfileInput;
}
