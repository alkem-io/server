import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { ICalloutGroup } from '@domain/collaboration/callout-groups/callout.group.interface';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CalloutGroupName } from '@common/enums/callout.group.name';

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

  @Field(() => [CreateCalloutInput], {
    nullable: true,
    description: 'The Callouts to add to this Collaboration.',
  })
  @ValidateNested()
  @IsOptional()
  @Type(() => CreateCalloutInput)
  calloutsData?: CreateCalloutInput[];

  calloutGroups?: ICalloutGroup[];

  defaultCalloutGroupName?: CalloutGroupName;
}
