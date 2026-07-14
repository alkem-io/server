import { UpdateInnovationFlowStateSettingsInput } from '@domain/collaboration/innovation-flow-state-settings/dto/innovation.flow.state.settings.dto.update';
import { UUID } from '@domain/common/scalars';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType } from '@nestjs/graphql';
import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@src/common/constants';
import { Type } from 'class-transformer';
import { MaxLength, ValidateNested } from 'class-validator';

@InputType()
export class UpdateInnovationFlowStateInput {
  @Field(() => UUID, {
    nullable: false,
    description: 'ID of the Innovation Flow',
  })
  innovationFlowStateID!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Optional. The display name for the State; omission leaves the stored value unchanged.',
  })
  @MaxLength(SMALL_TEXT_LENGTH)
  displayName?: string;

  @Field(() => Markdown, {
    nullable: true,
    description:
      'Optional. The explanation text to clarify the State; omission leaves the stored value unchanged.',
  })
  @MaxLength(LONG_TEXT_LENGTH)
  description?: string;

  @Field(() => UpdateInnovationFlowStateSettingsInput, { nullable: true })
  @ValidateNested()
  @Type(() => UpdateInnovationFlowStateSettingsInput)
  settings?: UpdateInnovationFlowStateSettingsInput;
}
