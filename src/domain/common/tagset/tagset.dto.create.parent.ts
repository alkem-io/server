import { Field, InputType } from '@nestjs/graphql';
import { UUID } from '../scalars/scalar.uuid';
import { CreateTagsetInput } from './tagset.dto.create';

@InputType()
export class CreateTagsetParentInput extends CreateTagsetInput {
  @Field(() => UUID, { nullable: true })
  parentID!: string;
}
