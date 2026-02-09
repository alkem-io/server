import { CreateCalloutsSetInput } from '@domain/collaboration/callouts-set/dto/callouts.set.dto.create';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

@InputType()
@ObjectType('CreateCollaborationData')
export class CreateCollaborationInput {
  @Field(() => CreateInnovationFlowInput, {
    nullable: true,
    description: 'The InnovationFlow Template to use for this Collaboration.',
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => CreateInnovationFlowInput)
  innovationFlowData?: CreateInnovationFlowInput;

  @Field(() => CreateCalloutsSetInput, {
    nullable: false,
    description: 'The CalloutsSet to use for this Collaboration.',
  })
  @ValidateNested()
  @Type(() => CreateCalloutsSetInput)
  calloutsSetData!: CreateCalloutsSetInput;

  isTemplate?: boolean;
}
