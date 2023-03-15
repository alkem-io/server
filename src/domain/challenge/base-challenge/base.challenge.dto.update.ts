import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { UpdateContextInput } from '@domain/context/context/dto/context.dto.update';
import { UpdateNameableInputOld } from '@domain/common/entity/nameable-entity/dto/nameable.dto.update.old';
import { Type } from 'class-transformer';

@InputType()
export class UpdateBaseChallengeInput extends UpdateNameableInputOld {
  @Field(() => UpdateContextInput, {
    nullable: true,
    description: 'Update the contained Context entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateContextInput)
  context?: UpdateContextInput;

  @Field(() => [String], {
    nullable: true,
    description: 'Update the tags on the Tagset.',
  })
  @IsOptional()
  tags?: string[];
}
