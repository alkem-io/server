import { ContextInput } from '@domain/context/context.dto';
import { Field, InputType } from '@nestjs/graphql';
import {
  IsUniqueTextId,
  TextIdType,
} from '@utils/validation/constraints/is.unique.text.id';
import { MaxLength } from 'class-validator';

@InputType()
export class OpportunityInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(15)
  @IsUniqueTextId(TextIdType.challenge)
  textID?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  state?: string;

  @Field(() => ContextInput, { nullable: true })
  context?: ContextInput;
}
