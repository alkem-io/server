import { Field, InputType } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ReferenceInput } from '../reference/reference.dto';

@InputType()
export class ContextInput {
  @Field({ nullable: true })
  @MaxLength(4096)
  background?: string;

  @Field({ nullable: true })
  @MaxLength(128)
  lifecyclePhase?: string;

  @Field({ nullable: true })
  @MaxLength(1024)
  vision?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  tagline?: string;

  @Field({ nullable: true })
  @MaxLength(1024)
  who?: string;

  @Field({ nullable: true })
  @MaxLength(1024)
  impact?: string;

  @Field(() => [ReferenceInput], { nullable: true })
  references?: ReferenceInput[];
}
