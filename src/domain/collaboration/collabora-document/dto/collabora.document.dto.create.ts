import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateCollaboraDocumentInput {
  @Field(() => String, {
    description: 'Title for the new collaborative document.',
  })
  displayName!: string;

  @Field(() => CollaboraDocumentType, {
    description: 'Type of document to create.',
  })
  documentType!: CollaboraDocumentType;
}
