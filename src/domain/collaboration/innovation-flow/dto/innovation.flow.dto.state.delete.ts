import { DeleteBaseAlkemioInput } from '@domain/common/entity/base-entity/dto/base.alkemio.dto.delete';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteStateOnInnovationFlowInput extends DeleteBaseAlkemioInput {
  @Field(() => UUID, { nullable: false })
  innovationFlowID!: string;
}
