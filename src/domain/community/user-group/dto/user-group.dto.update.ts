import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UpdateBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UpdateProfileInput } from '../../profile/dto';

@InputType()
export class UpdateUserGroupInput extends UpdateBaseAlkemioInput {
  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => UpdateProfileInput, { nullable: true })
  profileData?: UpdateProfileInput;
}
