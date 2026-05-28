import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';

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

  // Not exposed in the GraphQL schema. Used by createCalloutOnCalloutsSet's
  // resolver to plumb a buffered Upload from the multipart request through to
  // CollaboraDocumentService.createCollaboraDocument, which dispatches to its
  // upload mode when this is set. Mirrors the mediaGallery transient-field
  // pattern in CreateCalloutFramingInput.
  uploadedFile?: { buffer: Buffer; filename: string; mimetype: string };
}
