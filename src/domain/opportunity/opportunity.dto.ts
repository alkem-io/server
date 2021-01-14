import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ContextInput } from '@domain/context/context.dto';
import {
  IsUniqueTextId,
  TextIdType,
} from '@utils/validation/constraints/is.unique.text.id';

@InputType()
export class OpportunityInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(15)
  @IsUniqueTextId(TextIdType.opportunity)
  textID?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  state?: string;

  @Field(() => ContextInput, { nullable: true })
  context?: ContextInput;
}
