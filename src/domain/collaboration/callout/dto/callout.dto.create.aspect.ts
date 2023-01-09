import { UUID } from '@domain/common/scalars';
import { CreateAspectInput } from '@domain/collaboration/aspect/dto/aspect.dto.create';
import { InputType, Field } from '@nestjs/graphql';
import { MaxLength } from 'class-validator';
import { UUID_LENGTH } from '@common/constants';

@InputType()
export class CreateAspectOnCalloutInput extends CreateAspectInput {
  @Field(() => UUID, { nullable: false })
  @MaxLength(UUID_LENGTH)
  calloutID!: string;
}
