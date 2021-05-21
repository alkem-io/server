import { InputType, Field } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';
import { UpdateContextInput } from '@domain/context/context/context.dto.update';
import { UpdateNameableInput } from '@domain/common/nameable-entity';

@InputType()
export class UpdateBaseChallengeInput extends UpdateNameableInput {
  @Field(() => UpdateContextInput, { nullable: true })
  @IsOptional()
  context?: UpdateContextInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
