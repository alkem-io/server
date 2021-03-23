import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';
import { ProfileInput } from '@domain/community/profile/profile.dto';

@InputType()
export class UpdateOrganisationInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  ID!: string;

  @Field({ nullable: true, description: 'The name for this organisation' })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => ProfileInput, { nullable: true })
  profileData?: ProfileInput;
}
