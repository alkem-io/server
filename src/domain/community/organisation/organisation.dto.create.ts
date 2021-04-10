import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH, TINY_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';
import {
  IsUniqueTextId,
  TextIdType,
} from '@src/core/validation/constraints/unique.text.id';
import { CreateProfileInput } from '@domain/community/profile';

@InputType()
export class CreateOrganisationInput {
  @Field({ nullable: false, description: 'The name for this organisation' })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field({ nullable: true })
  @IsUniqueTextId(TextIdType.organisation, {
    message: 'Challenge with the textID: $value already exists!',
  })
  @Field({
    nullable: false,
    description: 'The unique text based ID for this organisation',
  })
  @MaxLength(TINY_TEXT_LENGTH)
  textID!: string;

  @Field(() => CreateProfileInput, { nullable: true })
  profileData?: CreateProfileInput;
}
