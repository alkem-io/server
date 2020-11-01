import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class TemplateInput {
  @Field({ nullable: true })
  @MaxLength(30)
  name!: string;

  @Field({ nullable: true })
  @MaxLength(300)
  description!: string;
}
