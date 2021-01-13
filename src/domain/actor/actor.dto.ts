import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';

@InputType()
export class ActorInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @Field({ nullable: true })
  @MaxLength(200)
  value!: string;

  @Field({ nullable: true })
  @MaxLength(200)
  impact!: string;
}
