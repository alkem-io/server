import { IInnovationFlowSettings } from '@domain/collaboration/innovation-flow-settings/innovation.flow.settings.interface';
import { CreateInnovationFlowStateInput } from '@domain/collaboration/innovation-flow-state/dto/innovation.flow.state.dto.create';
import { CreateProfileInput } from '@domain/common/profile/dto';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';

@InputType()
@ObjectType('CreateInnovationFlowData')
export class CreateInnovationFlowInput {
  @Field(() => CreateProfileInput, { nullable: false })
  @ValidateNested()
  @Type(() => CreateProfileInput)
  profile!: CreateProfileInput;

  @Field(() => [CreateInnovationFlowStateInput], { nullable: false })
  @ValidateNested({ each: true })
  @Type(() => CreateInnovationFlowStateInput)
  states!: CreateInnovationFlowStateInput[];

  currentStateDisplayName?: string;

  settings!: IInnovationFlowSettings;
}
