import { InputType, Field, ObjectType } from '@nestjs/graphql';
import { CreateCalloutInput } from '@domain/collaboration/callout';
import { ICalloutGroup } from '@domain/collaboration/callouts-set/dto/callout.group.interface';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { CalloutGroupName } from '@common/enums/callout.group.name';

@InputType()
@ObjectType('CreateCalloutsSetData')
export class CreateCalloutsSetInput {
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
