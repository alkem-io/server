import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, MaxLength } from 'class-validator';
import { SMALL_TEXT_LENGTH } from '@src/common/constants';
import { UpdateContextInput } from '@domain/context/context/context.dto.update';
import { UpdateBaseCherrytwistInput } from '@domain/common/base-entity/base.cherrytwist.dto.update';

@InputType()
export class UpdateOpportunityInput extends UpdateBaseCherrytwistInput {
  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(SMALL_TEXT_LENGTH)
  name?: string;

  @Field(() => UpdateContextInput, { nullable: true })
  @IsOptional()
  context?: UpdateContextInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
