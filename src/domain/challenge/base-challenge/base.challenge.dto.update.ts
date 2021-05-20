import { InputType, Field } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UpdateContextInput } from '@domain/context/context/context.dto.update';
import { UpdateIdentifiableInput } from '@domain/common/identifiable-entity';

@InputType()
export class UpdateBaseChallengeInput extends UpdateIdentifiableInput {
  @Field(() => UpdateContextInput, { nullable: true })
  @IsOptional()
  context?: UpdateContextInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
