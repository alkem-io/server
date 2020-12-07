import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class AspectInput {
  @Field({ nullable: true })
  @MaxLength(80)
  title!: string;

  @Field({ nullable: true })
  @MaxLength(400)
  framing!: string;

  @Field({ nullable: true })
  @MaxLength(400)
  explanation!: string;
}
