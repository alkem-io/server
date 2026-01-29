import { CreateCalloutInput } from '@domain/collaboration/callout/dto';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';

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
}
