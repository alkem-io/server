import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
@ObjectType('CreateCollaboraDocumentData')
export class CreateCollaboraDocumentInput {
  @Field(() => String, {
    nullable: true,
    description:
      'Title for the new collaborative document. Required for blank-create. On the upload path, defaulted from the uploaded filename (extension stripped) when absent or empty.',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @Field(() => CollaboraDocumentType, {
    nullable: true,
    description:
      "Type of document to create. Required for blank-create. On the upload path, ignored — the type is derived from the uploaded file's sniffed MIME by file-service-go.",
  })
  @IsOptional()
  @IsEnum(CollaboraDocumentType)
  documentType?: CollaboraDocumentType;

  @Field(() => UUID, {
    nullable: true,
    description:
      "Copy an existing CollaboraDocument's current content into the new document. " +
      'The copy owns its own backing file from the moment it is created: editing it never ' +
      'changes the source, and editing the source never changes it. Mutually exclusive with ' +
      'the upload path. documentType, originalMimeType and displayName are inherited from ' +
      'the source. READ on the source is authorized server-side.',
  })
  @IsOptional()
  @IsUUID()
  sourceCollaboraDocumentID?: string;

  // Not exposed in the GraphQL schema. Used by createCalloutOnCalloutsSet's
  // resolver to plumb a buffered Upload from the multipart request through to
  // CollaboraDocumentService.createCollaboraDocument, which dispatches to its
  // upload mode when this is set. Mirrors the mediaGallery transient-field
  // pattern in CreateCalloutFramingInput.
  uploadedFile?: { buffer: Buffer; filename: string; mimetype: string };
}
