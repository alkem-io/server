import { Field, InputType } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';
import { UpdateProfileInput } from '@domain/community/profile';
import { UpdateBaseCherrytwistInput } from '@domain/common/base-entity';
@InputType()
export class UpdateOrganisationInput extends UpdateBaseCherrytwistInput {
  @Field({ nullable: true, description: 'The name for this organisation' })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => UpdateProfileInput, { nullable: true })
  profileData?: UpdateProfileInput;
}
