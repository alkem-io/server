import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { ContextInput } from '@domain/context/context.dto';
import { IsUniqTextId, TextIdType } from '@utils/validation/is-unique-text-id';

@InputType()
export class ChallengeInput {
  @Field({ nullable: true })
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @MaxLength(15)
  @IsUniqTextId(TextIdType.challenge)
  textID?: string;

  @Field({ nullable: true })
  @MaxLength(255)
  state?: string;

  @Field(() => ContextInput, { nullable: true })
  context?: ContextInput;

  @Field(() => [String], { nullable: true })
  tags?: string[];
}
