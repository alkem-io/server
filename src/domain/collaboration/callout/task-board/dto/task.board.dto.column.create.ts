import { SMALL_TEXT_LENGTH } from '@common/constants/entity.field.length.constants';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength } from 'class-validator';

@InputType()
export class CreateTaskColumnOnCalloutInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'The Tasks board Callout to add a column to.',
  })
  calloutID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The name of the new column. Appended after the last column.',
  })
  @IsNotEmpty()
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;
}
