import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class AspectInput {
  @Field({ nullable: true })
  @MaxLength(80)
  title!: string;

  @Field({ nullable: true })
  @MaxLength(300)
  framing!: string;

  @Field({ nullable: true })
  @MaxLength(300)
  explanation!: string;
}
