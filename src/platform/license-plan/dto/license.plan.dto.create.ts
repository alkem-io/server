import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateLicensePlanInput {
  @Field(() => String, {
    description: 'The name of the License Plan',
    nullable: false,
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;
}
