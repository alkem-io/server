import { Field, InputType } from '@nestjs/graphql';
import { MaxLength, ValidateNested } from 'class-validator';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { UpdateInnovationFlowStateSettingsInput } from '@domain/collaboration/innovation-flow-state-settings/dto/innovation.flow.state.settings.dto.update';
import { Type } from 'class-transformer';
import { UUID } from '@domain/common/scalars';

@InputType()
export class UpdateInnovationFlowStateInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the Innovation Flow',
  })
  innovationFlowStateID!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The display name for the State',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName!: string;

  @Field(() => Markdown, {
    nullable: true,
    description: 'The explanation text to clarify the State.',
  })
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => UpdateInnovationFlowStateSettingsInput, { nullable: true })
  @ValidateNested()
  @Type(() => UpdateInnovationFlowStateSettingsInput)
  settings?: UpdateInnovationFlowStateSettingsInput;
}
