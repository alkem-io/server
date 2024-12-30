import { CreateCalloutInput } from '@domain/collaboration/callout/dto/callout.dto.create';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCalloutOnCalloutsSetInput extends CreateCalloutInput {
  @Field(() => UUID, { nullable: false })
  calloutsSetID!: string;
}
