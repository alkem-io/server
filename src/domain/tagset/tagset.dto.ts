import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class TagsetInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name!: string;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}
