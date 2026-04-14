import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import { IAuthorizable } from '@domain/common/entity/authorizable-entity/authorizable.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IDocument } from '@domain/storage/document/document.interface';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CollaboraDocument')
export abstract class ICollaboraDocument extends IAuthorizable {
  @Field(() => CollaboraDocumentType, {
    nullable: false,
    description: 'The type of the collaborative document.',
  })
  documentType!: CollaboraDocumentType;

  createdBy?: string;

  // Exposed through field resolver
  profile?: IProfile;

  // Internal relation, not exposed via GraphQL
  document?: IDocument;
}
