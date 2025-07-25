import { LONG_TEXT_LENGTH, SMALL_TEXT_LENGTH } from '@common/constants';
import { CreateInnovationFlowStateSettingsInput } from '@domain/collaboration/innovation-flow-state-settings/dto/innovation.flow.state.settings.dto.create';
import { Markdown } from '@domain/common/scalars/scalar.markdown';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { MaxLength, ValidateNested } from 'class-validator';

@InputType()
@ObjectType('CreateInnovationFlowStateData')
export class CreateInnovationFlowStateInput {
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

  @Field(() => Number, {
    nullable: true,
    description:
      'The sort order for the State; if not specified, it will be set to the next highest order.',
  })
  sortOrder?: number;

  @Field(() => CreateInnovationFlowStateSettingsInput, { nullable: true })
  @ValidateNested()
  @Type(() => CreateInnovationFlowStateSettingsInput)
  settings?: CreateInnovationFlowStateSettingsInput;
}
