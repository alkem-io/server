import { InputType, Field } from '@nestjs/graphql';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CalloutGroupName } from '@common/enums/callout.group.name';

@InputType()
export class CreateCollaborationInput {
  @Field(() => CreateInnovationFlowInput, {
    nullable: false,
    description: 'The InnovationFlow Template to use for this Collaboration.',
  })
  @ValidateNested()
  @Type(() => CreateCollaborationInput)
  innovationFlowData!: CreateInnovationFlowInput;

  @Field(() => [CreateCalloutInput], {
    nullable: false,
    description: 'The Callouts to add to this Collaboration.',
  })
  @ValidateNested()
  @Type(() => CreateCalloutInput)
  calloutsData!: CreateCalloutInput[];

  @Field(() => [ICalloutGroup], {
    nullable: false,
    description: 'The Callout Groups to add to this Collaboration.',
  })
  @ValidateNested()
  @Type(() => ICalloutGroup)
  calloutGroups!: ICalloutGroup[];

  @Field(() => [ICalloutGroup], {
    nullable: false,
    description:
      'The name of the default Callout Group for this Collaboration.',
  })
  defaultCalloutGroupName!: CalloutGroupName;
}
