import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty } from 'class-validator';

@InputType()
@ObjectType('CreateCollaboraDocumentData')
export class CreateCollaboraDocumentInput {
  @Field(() => String, {
    description: 'Title for the new collaborative document.',
  })
  @IsNotEmpty()
  displayName!: string;

  @Field(() => CollaboraDocumentType, {
    description: 'Type of document to create.',
  })
  @IsEnum(CollaboraDocumentType)
  documentType!: CollaboraDocumentType;
}
