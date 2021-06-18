import { InputType, Field } from '@nestjs/graphql';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { MaxLength } from 'class-validator';

@InputType()
export class CreateVisualInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  avatar!: string;

  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  background!: string;

  @Field({ nullable: true })
  @MaxLength(SMALL_TEXT_LENGTH)
  banner!: string;
}
