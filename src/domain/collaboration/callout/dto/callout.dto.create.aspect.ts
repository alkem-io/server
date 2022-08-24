import { UUID } from '@domain/common/scalars';
import { CreateAspectInput } from '@domain/collaboration/aspect/dto/aspect.dto.create';
import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateAspectOnCalloutInput extends CreateAspectInput {
  @Field(() => UUID, { nullable: false })
  calloutID!: string;
}
