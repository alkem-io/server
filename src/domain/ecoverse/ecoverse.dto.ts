import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ContextInput } from '../context/context.dto';
import { TagsInput } from '../tagset/tagset.dto';

@InputType()
export class EcoverseInput {
  @Field({ nullable: true, description: 'The new name for the ecoverse' })
  @MaxLength(100)
  name?: string;

  @Field({
    nullable: true,
    description:
      'Updated context for the ecoverse; will be merged with existing context',
  })
  context?: ContextInput;

  @Field(() => TagsInput, {
    nullable: true,
    description: 'The set of tags to apply to this ecoverse',
  })
  tags?: TagsInput;
}
