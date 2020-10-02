import { InputType, Field } from 'type-graphql';

@InputType()
export class TagsInput {
  @Field(() => [String], { nullable: true })
  tags?: string[];
}

