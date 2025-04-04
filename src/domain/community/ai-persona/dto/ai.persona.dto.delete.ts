import { DeleteBaseAlkemioInput } from '@domain/common/entity/base-entity';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteAiPersonaInput extends DeleteBaseAlkemioInput {
  @Field(() => UUID, { nullable: false })
  ID!: string;
}
