import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString, IsUUID } from 'class-validator';

@InputType()
export class ReplaceCollaboraDocumentInput {
  @Field(() => UUID, {
    description:
      'The ID of the CollaboraDocument whose backing file is being replaced.',
  })
  @IsUUID('all')
  ID!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'Optional title chosen in the replace dialog (defaults to the incoming file title). When supplied it is persisted as the CollaboraDocument display name (the same entity), propagating to the editor title and the download filename. Omit to leave the current name unchanged.',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
