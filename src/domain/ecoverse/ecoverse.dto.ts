import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ContextInput } from '../context/context.dto';
import { TagsInput } from '../tagset/tagset.dto';

@InputType()
export class EcoverseInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  context?: ContextInput;

  @Field(() => TagsInput, { nullable: true })
  tags?: TagsInput;
}
