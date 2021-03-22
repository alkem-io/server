import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH, TINY_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';
import { ProfileInput } from '@domain/community/profile/profile.dto';
import { IsUniqueTextId, TextIdType } from '@core/validation';

@InputType()
export class OrganisationInput {
  @Field({ nullable: true, description: 'The name for this organisation' })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field({ nullable: true })
  @IsUniqueTextId(TextIdType.organisation, {
    message: 'Challenge with the textID: $value already exists!',
  })
  @Field({
    nullable: true,
    description: 'The unique text based ID for this organisation',
  })
  @MaxLength(TINY_TEXT_LENGTH)
  textID!: string;

  @Field(() => ProfileInput, { nullable: true })
  profileData?: ProfileInput;
}
