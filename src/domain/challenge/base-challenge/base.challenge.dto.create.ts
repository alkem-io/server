import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { CreateContextInput } from '@domain/context/context/dto/context.dto.create';
import { CreateNameableInputOld } from '@domain/common/entity/nameable-entity/dto/nameable.dto.create.old';
import { Type } from 'class-transformer';

@InputType()
export class CreateBaseChallengeInput extends CreateNameableInputOld {
  @Field(() => CreateContextInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateContextInput)
  context?: CreateContextInput;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  tags?: string[];
}
