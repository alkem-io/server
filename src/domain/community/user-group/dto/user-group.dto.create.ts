import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { CreateProfileInput } from '@domain/community/profile/dto';
import { UUID } from '@domain/common/scalars/scalar.uuid';

@InputType()
export class CreateUserGroupInput {
  @Field(() => UUID, { nullable: false })
  parentID!: string;

  @Field({
    nullable: false,
    description: 'The name of the UserGroup. Minimum length 2.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => CreateProfileInput, { nullable: true })
  profileData?: CreateProfileInput;
}
