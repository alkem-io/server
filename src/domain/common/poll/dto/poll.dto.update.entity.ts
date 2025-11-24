import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field } from '@nestjs/graphql';
import { UpdatePollInput } from './poll.dto.update';

@InputType()
export class UpdatePollEntityInput extends UpdatePollInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
