import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { ContextInput } from '@domain/context/context.dto';

@InputType()
export class OpportunityInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(15)
  textID?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(255)
  state?: string;

  @Field(() => ContextInput, { nullable: true })
  @IsOptional()
  context?: ContextInput;
}
