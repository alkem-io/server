import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class ProfileInput {
  @Field({ nullable: true })
  @MaxLength(250)
  avatar!: string;

  @Field({ nullable: true })
  @MaxLength(400)
  description!: string;
}
