import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { CreateContextInput } from '@domain/context/context';
import { TextID } from '@domain/common/scalars';
// import {
//   IsUniqueTextId,
//   TextIdType,
// } from '@src/core/validation/constraints/unique.text.id';

@InputType()
export class CreateEcoverseInput {
  @Field(() => TextID, {
    nullable: false,
    description: 'The unique text ID for the ecoverse',
  })
  // @IsUniqueTextId(TextIdType.ecoverse, {
  //   message: 'Ecoverse with the textID: $value already exists!',
  // })
  textID!: string;

  @Field({ nullable: false, description: 'The name for the ecoverse' })
  @MaxLength(SMALL_TEXT_LENGTH)
  name!: string;

  @Field({
    nullable: true,
    description: 'The host Organisation for the ecoverse',
  })
  @IsOptional()
  hostID?: string;

  @Field({
    nullable: true,
    description: 'Context for the Ecoverse.',
  })
  context?: CreateContextInput;

  @Field(() => [String], {
    nullable: true,
    description: 'The set of tags to apply to this Ecoverse',
  })
  @IsOptional()
  tags?: string[];
}
