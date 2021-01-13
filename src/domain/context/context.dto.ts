import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { ReferenceInput } from '@domain/reference/reference.dto';

@InputType()
export class ContextInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(4096)
  background?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(1024)
  vision?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(255)
  tagline?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(1024)
  who?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(1024)
  impact?: string;

  @Field(() => [ReferenceInput], {
    nullable: true,
    description: 'Set of references to _replace_ the existing references',
  })
  @IsOptional()
  references?: ReferenceInput[];
}
