import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class UpdateCollaboraDocumentInput {
  @Field(() => UUID, {
    description: 'The ID of the CollaboraDocument to update.',
  })
  ID!: string;

  @Field(() => String, {
    nullable: true,
    description: 'Updated display name for the document.',
  })
  displayName?: string;
}
