import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ContextInput } from '../context/context.dto';
import { TagsInput } from '../tagset/tagset.dto';

@InputType()
export class OpportunityInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(15)
  textID?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  state?: string;

  @Field(() => ContextInput, { nullable: true })
  context?: ContextInput;

  @Field(() => TagsInput, { nullable: true })
  tagset?: TagsInput;
}
