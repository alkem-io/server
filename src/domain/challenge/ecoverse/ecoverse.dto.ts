import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { ContextInput } from '@domain/context/context/context.dto';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';

@InputType()
export class EcoverseInput {
  @Field({ nullable: true, description: 'The new name for the ecoverse' })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field({
    nullable: true,
    description:
      'Updated context for the ecoverse; will be merged with existing context',
  })
  context?: ContextInput;

  @Field(() => [String], {
    nullable: true,
    description: 'The set of tags to apply to this ecoverse',
  })
  @IsOptional()
  tags?: string[];
}
