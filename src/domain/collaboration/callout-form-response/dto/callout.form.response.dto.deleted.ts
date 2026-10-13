import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, ObjectType } from '@nestjs/graphql';

// The delete payload carries only the id: a moderator need not be in the read
// audience of the response they remove, so its answers must never come back.
@ObjectType('DeletedCalloutFormResponse')
export class DeletedCalloutFormResponse {
  @Field(() => UUID, {
    nullable: false,
    description: 'The id of the deleted Form response.',
  })
  id!: string;
}
