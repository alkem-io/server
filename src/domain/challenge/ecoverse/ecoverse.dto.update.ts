import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UpdateContextInput } from '@domain/context/context/context.dto.update';

@InputType()
export class UpdateEcoverseInput {
  @Field({ nullable: false })
  @MaxLength(SMALL_TEXT_LENGTH)
  ID!: string;

  @Field({ nullable: true, description: 'The new name for the ecoverse' })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field({
    nullable: true,
    description: 'The host Organisation for the ecoverse',
  })
  @IsOptional()
  hostID?: number;

  @Field({
    nullable: true,
    description:
      'Updated context for the ecoverse; will be merged with existing context',
  })
  context?: UpdateContextInput;

  @Field(() => [String], {
    nullable: true,
    description: 'The set of tags to apply to this ecoverse',
  })
  @IsOptional()
  tags?: string[];
}
