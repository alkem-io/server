import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';
import {
  IsUniqueTextId,
  TextIdType,
} from '@src/core/validation/constraints/unique.text.id';
import { CreateProfileInput } from '@domain/community/profile';
import { TextID } from '@domain/common/scalars';

@InputType()
export class CreateOrganisationInput {
  @Field({ nullable: false, description: 'The name for this organisation' })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => TextID, { nullable: true })
  @IsUniqueTextId(TextIdType.organisation, {
    message: 'Organisation with the textID: $value already exists!',
  })
  @Field({
    nullable: false,
    description: 'The unique text based ID for this organisation',
  })
  textID!: string;

  @Field(() => CreateProfileInput, { nullable: true })
  profileData?: CreateProfileInput;
}
