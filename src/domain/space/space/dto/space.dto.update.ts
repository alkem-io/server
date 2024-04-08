import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.update';
import { UpdateContextInput } from '@domain/context/context/dto/context.dto.update';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';

@InputType()
export class UpdateSpaceInput extends UpdateNameableInput {
  @Field(() => UpdateInnovationFlowInput, {
    nullable: true,
    description: 'The Profile of the InnovationFlow of this entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateInnovationFlowInput)
  innovationFlowData?: UpdateInnovationFlowInput;

  @Field(() => UpdateContextInput, {
    nullable: true,
    description: 'Update the contained Context entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateContextInput)
  context?: UpdateContextInput;
}
