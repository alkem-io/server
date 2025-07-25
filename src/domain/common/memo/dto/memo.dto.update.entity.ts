import { UUID } from '@domain/common/scalars/scalar.uuid';
import { InputType, Field } from '@nestjs/graphql';
import { UpdateMemoInput } from './memo.dto.update';

@InputType()
export class UpdateMemoEntityInput extends UpdateMemoInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
