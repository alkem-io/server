import { Field, InputType } from '@nestjs/graphql';
import { UpdateProfileInput } from '@domain/common/profile/dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-state/dto/innovation.flow.state.dto.update';

@InputType()
export class UpdateInnovationFlowInput {
  @Field(() => UpdateProfileInput, {
    nullable: true,
    description: 'The Profile of this entity.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateProfileInput)
  profileData?: UpdateProfileInput;

  @Field(() => [UpdateInnovationFlowStateInput], { nullable: true })
  @ValidateNested({ each: true })
  @Type(() => UpdateInnovationFlowStateInput)
  states!: UpdateInnovationFlowStateInput[];
}
