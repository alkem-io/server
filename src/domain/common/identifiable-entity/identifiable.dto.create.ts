import { SMALL_TEXT_LENGTH } from '@common/constants';
import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { TextID } from '@domain/common/scalars';

@InputType()
export class CreateIdentifiableInput {
  @Field({ nullable: false, description: 'The name for the entity.' })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field(() => TextID, {
    nullable: false,
    description: 'A display identifier, unique within the containing entity.',
  })
  textID!: string;
}
