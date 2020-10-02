import { InputType, Field } from 'type-graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class TagsetInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name?: string;
  tags?: string[];
}

@InputType()
export class UpdateNestedTagsetInput extends TagsetInput {
  @Field()
  id!: number;
}

@InputType()
export class UpdateRootTagsetInput extends TagsetInput {
  @Field({ nullable: true })
  id?: number;
}
