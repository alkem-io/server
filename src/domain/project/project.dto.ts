import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class ProjectInput {
  @Field({ nullable: true })
  @MaxLength(80)
  name!: string;

  @Field({ nullable: true })
  @MaxLength(20)
  textID!: string;

  @Field({ nullable: true })
  @MaxLength(300)
  description!: string;

  @Field({ nullable: true })
  @MaxLength(100)
  state!: string;
}
