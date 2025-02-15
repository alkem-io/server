import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.update';
import { UpdateNameableInput } from '@domain/common/entity/nameable-entity';
import { UpdateSpaceAboutInput } from '@domain/space/space.about/dto/space.about.dto.update';

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

  @Field(() => UpdateSpaceAboutInput, {
    nullable: true,
    description: 'Update the Space About information.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSpaceAboutInput)
  about?: UpdateSpaceAboutInput;
}
