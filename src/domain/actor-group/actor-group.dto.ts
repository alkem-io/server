import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';

@InputType()
export class ActorGroupInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name!: string;

  @Field({ nullable: true })
  @MaxLength(200)
  description!: string;
}
