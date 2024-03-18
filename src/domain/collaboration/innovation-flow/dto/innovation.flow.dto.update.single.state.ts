import { Field, InputType } from '@nestjs/graphql';
import { MaxLength, ValidateNested } from 'class-validator';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Type } from 'class-transformer';
import { SMALL_TEXT_LENGTH } from '@common/constants';
import { UpdateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-states/dto/innovation.flow.state.dto.update';

@InputType()
export class UpdateInnovationFlowSingleStateInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the Innovation Flow',
  })
  innovationFlowID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The name of the Innovation Flow State to be updated',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  stateDisplayName!: string;

  @Field(() => UpdateInnovationFlowStateInput, { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => UpdateInnovationFlowStateInput)
  stateUpdatedData!: UpdateInnovationFlowStateInput;
}
