import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UpdateProfileInput } from '@domain/community/profile';
import { UpdateBaseCherrytwistInput } from '@domain/common/entity/base-entity';

@InputType()
export class UpdateUserGroupInput extends UpdateBaseCherrytwistInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => UpdateProfileInput, { nullable: true })
  profileData?: UpdateProfileInput;
}
