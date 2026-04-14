import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DeleteCollaboraDocumentInput {
  @Field(() => UUID, {
    description: 'The ID of the CollaboraDocument to delete.',
  })
  ID!: string;
}
